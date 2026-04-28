"use client";

import { useState, useCallback, useRef } from "react";
import { FormWizard, useWizardContext } from "@/components/forms/form-wizard";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormInput, FormSelect } from "@/components/forms/form-input";
import { PillSelect } from "@/components/forms/pill-select";
import { YesNoToggle } from "@/components/forms/yes-no-toggle";
import { RepeaterField } from "@/components/forms/repeater-field";
import { ConditionalBlock } from "@/components/forms/conditional-block";
import { PaymentStep } from "@/components/forms/payment-step";
import { FormSuccess } from "@/components/forms/form-success";
import { FileUpload } from "@/components/forms/file-upload";
import type { TenantFormData, Occupant, FormStepDef, StagedAttachments } from "@/lib/form-types";
import { createEmptyTenantForm, createEmptyStagedAttachments } from "@/lib/form-types";
import { formatPhone, formatZip, formatDOB } from "@/lib/form-formatters";
import { sanitizeVoucherCaseNumber } from "@/lib/form-validators";
import { isDev, devTenantData, makeFakeStagedFile } from "@/lib/dev-autofill";
import {
  TENANT_STORAGE_KEY,
  clearFormState, getOrCreatePendingSubmission, setPendingUploadsFolderId,
  clearPendingSubmission,
} from "@/lib/form-storage";
import {
  BOROUGH_OPTIONS, US_STATES, ASSIST_PROGRAM_OPTIONS, VOUCHER_BEDROOM_OPTIONS,
  CREDIT_SCORE_OPTIONS, OCCUPANT_COUNT_OPTIONS, PAY_TYPE_OPTIONS,
  PAY_FREQUENCY_OPTIONS, INCOME_SOURCE_OPTIONS, SECTION_8_PROGRAMS,
  DOC_CATEGORY_CONFIGS, type DocCategory,
} from "@/lib/form-constants";
import {
  validateTenantStep1, validateTenantStep2, validateTenantStep3,
  validateTenantStep4, validateTenantStep5, validateTenantStep6,
} from "@/lib/form-step-validators";

function buildSteps(stagedAttachments: StagedAttachments): FormStepDef[] {
  return [
    { id: "contact", label: "Contact Info", shortLabel: "Contact", validate: (d) => validateTenantStep1(d as unknown as TenantFormData) },
    { id: "assistance", label: "Rental Assistance", shortLabel: "Assistance", validate: (d) => validateTenantStep2(d as unknown as TenantFormData) },
    { id: "occupants", label: "Occupants & Work", shortLabel: "Occupants", validate: (d) => validateTenantStep3(d as unknown as TenantFormData) },
    { id: "income", label: "Income & Specialist", shortLabel: "Income", validate: (d) => validateTenantStep4(d as unknown as TenantFormData) },
    { id: "documents", label: "Documents", shortLabel: "Docs", validate: (d) => validateTenantStep5Docs(d as unknown as TenantFormData, stagedAttachments) },
    { id: "payment", label: "Processing Fee", shortLabel: "Payment", validate: (d) => validateTenantStep5(d as unknown as TenantFormData) },
    { id: "authorization", label: "Authorization", shortLabel: "Sign", validate: (d) => validateTenantStep6(d as unknown as TenantFormData) },
  ];
}

let occupantIdCounter = 1;

function getRequiredDocCategories(data: TenantFormData): DocCategory[] {
  const required: DocCategory[] = ["photoId", "socialSecurityCard"];
  const isSection8 = SECTION_8_PROGRAMS.includes(data.assistProgram as typeof SECTION_8_PROGRAMS[number]);
  const isCityFHEPS = data.assistProgram === "CityFHEPS";
  const isNoProgram = data.hasAssistance === "no";
  const isHASA = data.assistProgram === "HASA";
  const isOther = data.assistProgram === "Other";

  if (isSection8) {
    required.push("voucherCoverLetter", "pinLetter");
  }
  if (data.incomeSources.includes("cash-assistance")) {
    required.push("cashAssistBudgetLetter");
  }
  if (data.incomeSources.includes("ssi")) {
    required.push("ssiAwardLetter");
  }
  if (data.incomeSources.includes("food-stamps")) {
    required.push("foodStampsLetter");
  }
  if (isCityFHEPS) {
    required.push("fullVoucher");
  }
  if (isNoProgram || isHASA || isOther) {
    required.push("taxReturns", "bankStatement");
  }
  return required;
}

function getVisibleDocCategories(data: TenantFormData): DocCategory[] {
  const visible: DocCategory[] = ["photoId", "socialSecurityCard"];
  const isSection8 = SECTION_8_PROGRAMS.includes(data.assistProgram as typeof SECTION_8_PROGRAMS[number]);
  const isCityFHEPS = data.assistProgram === "CityFHEPS";
  const isNoProgram = data.hasAssistance === "no";
  const isHASA = data.assistProgram === "HASA";
  const isOther = data.assistProgram === "Other";

  if (isSection8) {
    visible.push("voucherCoverLetter", "pinLetter");
  }
  if (data.incomeSources.includes("cash-assistance")) {
    visible.push("cashAssistBudgetLetter");
  }
  if (data.incomeSources.includes("ssi")) {
    visible.push("ssiAwardLetter");
  }
  if (data.incomeSources.includes("food-stamps")) {
    visible.push("foodStampsLetter");
  }
  if (isCityFHEPS) {
    visible.push("fullVoucher");
  }
  if (isNoProgram || isHASA || isOther) {
    visible.push("letterOfResidency", "landlordRecommendation", "taxReturns", "bankStatement");
  }
  visible.push("other");
  return visible;
}

const PRIMARY_APPLICANT_KEY = "__primary__";
const PER_PERSON_DOC_CATEGORIES: DocCategory[] = ["photoId", "socialSecurityCard"];

function getAdultOccupants(data: TenantFormData): { key: string; label: string }[] {
  return data.occupants
    .filter((o) => o.over18 === "yes" && o.name.trim())
    .map((o) => ({ key: o.name.trim(), label: o.name.trim() }));
}

function getPersonOptions(data: TenantFormData): { value: string; label: string }[] {
  const primaryName = `${data.firstName} ${data.lastName}`.trim() || "Primary applicant";
  const primary = { value: PRIMARY_APPLICANT_KEY, label: `${primaryName} (you)` };
  const adults = getAdultOccupants(data).map((o) => ({ value: o.key, label: o.label }));
  return [primary, ...adults];
}

function validateTenantStep5Docs(
  data: TenantFormData,
  stagedAttachments: StagedAttachments,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = getRequiredDocCategories(data);
  const adults = getAdultOccupants(data);
  const hasAdults = adults.length > 0;

  for (const cat of required) {
    const files = stagedAttachments[cat];
    if (files.length === 0) {
      errors[`doc:${cat}`] = `${DOC_CATEGORY_CONFIGS[cat].label} is required`;
      continue;
    }

    if (hasAdults && PER_PERSON_DOC_CATEGORIES.includes(cat)) {
      const unassigned = files.find((f) => !f.assignedTo);
      if (unassigned) {
        errors[`doc:${cat}`] = `Choose who each ${DOC_CATEGORY_CONFIGS[cat].label.toLowerCase()} belongs to`;
        continue;
      }
      const allKeys = [PRIMARY_APPLICANT_KEY, ...adults.map((a) => a.key)];
      const missing = allKeys.filter(
        (key) => !files.some((f) => f.assignedTo === key),
      );
      if (missing.length > 0) {
        const missingLabels = missing.map((k) =>
          k === PRIMARY_APPLICANT_KEY ? "you" : k,
        );
        errors[`doc:${cat}`] = `${DOC_CATEGORY_CONFIGS[cat].label} required for: ${missingLabels.join(", ")}`;
      }
    }
  }
  return errors;
}

function buildPrefixedFilename(
  category: DocCategory,
  originalName: string,
  usedNames: Set<string>,
): string {
  const prefix = DOC_CATEGORY_CONFIGS[category].label.replace(/[^a-zA-Z0-9]+/g, "-");
  const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
  const base = originalName.includes(".")
    ? originalName.slice(0, originalName.lastIndexOf("."))
    : originalName;
  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

  let candidate = `${prefix}_${safeBase}${ext}`;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${prefix}_${safeBase}-${counter}${ext}`;
    counter++;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function uploadAllStagedFiles(
  attachments: StagedAttachments,
  uploadsFolderId: string,
  occupantFolderIds: Record<string, string>,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const usedNames = new Set<string>();
  const entries = Object.entries(attachments) as [DocCategory, typeof attachments[DocCategory]][];
  const allFiles = entries.flatMap(([category, files]) =>
    files.map((staged) => ({ category, staged })),
  );
  const total = allFiles.length;

  for (let i = 0; i < allFiles.length; i++) {
    onProgress?.(i + 1, total);
    const { category, staged } = allFiles[i];
    const prefixedName = buildPrefixedFilename(category, staged.fileName, usedNames);
    const renamedFile = new File([staged.file], prefixedName, { type: staged.file.type });

    let targetFolderId = uploadsFolderId;
    if (
      PER_PERSON_DOC_CATEGORIES.includes(category) &&
      staged.assignedTo &&
      staged.assignedTo !== PRIMARY_APPLICANT_KEY &&
      occupantFolderIds[staged.assignedTo]
    ) {
      targetFolderId = occupantFolderIds[staged.assignedTo];
    }

    const formData = new FormData();
    formData.append("file", renamedFile);
    formData.append("folderId", targetFolderId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Upload failed for ${staged.fileName}`);
    }
  }
}

type SubmissionPhase =
  | "idle"
  | "submitting-app"
  | "uploading-files"
  | "upload-failed"
  | "complete";

export function TenantForm() {
  const [data, setData] = useState<TenantFormData>(createEmptyTenantForm);
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachments>(createEmptyStagedAttachments);
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [submitProgress, setSubmitProgress] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [uploadsFolderId, setUploadsFolderId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [occupantFolderIds, setOccupantFolderIds] = useState<Record<string, string>>({});

  const submitLockRef = useRef(false);

  const steps = buildSteps(stagedAttachments);

  const handleChange = useCallback((field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBulkRestore = useCallback((restored: Record<string, unknown>) => {
    setData(restored as unknown as TenantFormData);
  }, []);

  const runUploads = useCallback(async (folderId: string, occFolderIds: Record<string, string>) => {
    const totalFiles = Object.values(stagedAttachments).flat().length;
    if (totalFiles === 0) return;
    setPhase("uploading-files");
    await uploadAllStagedFiles(
      stagedAttachments,
      folderId,
      occFolderIds,
      (current, total) => setSubmitProgress(`Uploading ${current} of ${total} files...`),
    );
  }, [stagedAttachments]);

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitError("");

    const pending = getOrCreatePendingSubmission(TENANT_STORAGE_KEY);

    try {
      let currentFolderId = folderId;
      let currentUploadsFolderId = uploadsFolderId;
      let currentOccupantFolderIds = occupantFolderIds;

      if (!currentUploadsFolderId) {
        setPhase("submitting-app");
        setSubmitProgress("Submitting application...");

        const res = await fetch("/api/apply/tenant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": pending.idempotencyKey,
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Submission failed");
        }
        const result = await res.json();
        currentFolderId = result.folderId as string;
        currentUploadsFolderId = result.uploadsFolderId as string;
        currentOccupantFolderIds = (result.occupantFolderIds as Record<string, string>) ?? {};
        if (currentFolderId) setFolderId(currentFolderId);
        if (currentUploadsFolderId) {
          setUploadsFolderId(currentUploadsFolderId);
          setPendingUploadsFolderId(TENANT_STORAGE_KEY, currentUploadsFolderId);
        }
        setOccupantFolderIds(currentOccupantFolderIds);
      }

      if (currentUploadsFolderId) {
        await runUploads(currentUploadsFolderId, currentOccupantFolderIds);
      }

      if (currentFolderId && currentUploadsFolderId) {
        setSubmitProgress("Finishing up...");
        try {
          await fetch("/api/apply/tenant/finalize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": pending.idempotencyKey,
            },
            body: JSON.stringify({
              folderId: currentFolderId,
              uploadsFolderId: currentUploadsFolderId,
            }),
          });
        } catch (err) {
          console.error("Finalize call failed:", err);
        }
      }

      clearFormState(TENANT_STORAGE_KEY);
      clearPendingSubmission(TENANT_STORAGE_KEY);
      setPhase("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
      setPhase(uploadsFolderId ? "upload-failed" : "idle");
    } finally {
      submitLockRef.current = false;
    }
  }, [data, folderId, occupantFolderIds, runUploads, uploadsFolderId]);

  if (phase === "complete") {
    return (
      <FormSuccess
        type="tenant"
        firstName={data.firstName}
      />
    );
  }

  return (
    <FormWizard
      steps={steps}
      data={data as unknown as Record<string, unknown>}
      onChange={handleChange}
      onBulkRestore={handleBulkRestore}
      renderStep={(stepIndex) => (
        <TenantStep
          step={stepIndex}
          data={data}
          stagedAttachments={stagedAttachments}
          setStagedAttachments={setStagedAttachments}
        />
      )}
      onSubmit={handleSubmit}
      isSubmitting={phase === "submitting-app" || phase === "uploading-files"}
      submitLabel={phase === "upload-failed" ? "Retry Upload" : undefined}
      submitProgress={submitProgress}
      submitError={submitError}
      storageKey={TENANT_STORAGE_KEY}
      title="Tenant Application"
      devAutofill={isDev ? {
        fill: () => devTenantData() as unknown as Record<string, unknown>,
        jumpToStep: 4,
        onAfterFill: (filled) => {
          const filledTenant = filled as unknown as TenantFormData;
          const required = getRequiredDocCategories(filledTenant);
          const adults = getAdultOccupants(filledTenant);
          const owners = adults.length > 0
            ? [PRIMARY_APPLICANT_KEY, ...adults.map((a) => a.key)]
            : [undefined];

          const next = createEmptyStagedAttachments();
          for (const cat of required) {
            const config = DOC_CATEGORY_CONFIGS[cat];
            const isPerPerson = adults.length > 0 && PER_PERSON_DOC_CATEGORIES.includes(cat);
            if (isPerPerson) {
              for (const owner of owners) {
                next[cat].push(makeFakeStagedFile(`${config.label}-${owner ?? "primary"}`, owner));
              }
            } else {
              next[cat].push(makeFakeStagedFile(config.label));
            }
          }
          setStagedAttachments(next);
        },
      } : undefined}
    />
  );
}

function TenantStep({
  step,
  data,
  stagedAttachments,
  setStagedAttachments,
}: {
  step: number;
  data: TenantFormData;
  stagedAttachments: StagedAttachments;
  setStagedAttachments: React.Dispatch<React.SetStateAction<StagedAttachments>>;
}) {
  const { errors, onChange } = useWizardContext();

  switch (step) {
    case 0: return <Step1Contact data={data} onChange={onChange} errors={errors} />;
    case 1: return <Step2Assistance data={data} onChange={onChange} errors={errors} />;
    case 2: return <Step3Occupants data={data} onChange={onChange} errors={errors} />;
    case 3: return <Step4Income data={data} onChange={onChange} errors={errors} />;
    case 4: return (
      <StepDocuments
        data={data}
        errors={errors}
        stagedAttachments={stagedAttachments}
        setStagedAttachments={setStagedAttachments}
      />
    );
    case 5: return <Step5Payment data={data} onChange={onChange} errors={errors} />;
    case 6: return <Step6Auth data={data} onChange={onChange} errors={errors} />;
    default: return null;
  }
}

interface StepProps {
  data: TenantFormData;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

function Step1Contact({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-0">
      <FormSection heading="Personal Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="firstName" label="First Name" required error={errors.firstName}>
            <FormInput
              value={data.firstName}
              onChange={(e) => onChange("firstName", e.target.value)}
              autoComplete="given-name"
              placeholder="First name"
            />
          </FormField>
          <FormField name="lastName" label="Last Name" required error={errors.lastName}>
            <FormInput
              value={data.lastName}
              onChange={(e) => onChange("lastName", e.target.value)}
              autoComplete="family-name"
              placeholder="Last name"
            />
          </FormField>
        </div>

        <FormField name="dateOfBirth" label="Date of Birth" required error={errors.dateOfBirth}>
          <FormInput
            value={data.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", formatDOB(e.target.value))}
            inputMode="numeric"
            placeholder="MM-DD-YYYY"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="cellPhone" label="Phone Number" required error={errors.cellPhone}>
            <FormInput
              value={data.cellPhone}
              onChange={(e) => onChange("cellPhone", formatPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
            />
          </FormField>
          <FormField name="email" label="Email" required error={errors.email}>
            <FormInput
              type="email"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="emergencyContactName" label="Emergency Contact Name" error={errors.emergencyContactName}>
            <FormInput
              value={data.emergencyContactName}
              onChange={(e) => onChange("emergencyContactName", e.target.value)}
              placeholder="Full name"
            />
          </FormField>
          <FormField name="emergencyContactPhone" label="Emergency Contact Phone" error={errors.emergencyContactPhone}>
            <FormInput
              value={data.emergencyContactPhone}
              onChange={(e) => onChange("emergencyContactPhone", formatPhone(e.target.value))}
              inputMode="tel"
              placeholder="(555) 555-5555"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection heading="Preferred Borough">
        <FormField name="preferredBorough" label="Where would you like to live?" required error={errors.preferredBorough}>
          <PillSelect
            name="preferredBorough"
            value={data.preferredBorough}
            onChange={(v) => onChange("preferredBorough", v)}
            options={BOROUGH_OPTIONS}
            columns={2}
            error={!!errors.preferredBorough}
          />
        </FormField>
      </FormSection>

      <FormSection heading="Current Address">
        <FormField name="currentStreet" label="Street Address" required error={errors.currentStreet}>
          <FormInput
            value={data.currentStreet}
            onChange={(e) => onChange("currentStreet", e.target.value)}
            autoComplete="address-line1"
            placeholder="123 Main St"
          />
        </FormField>
        <FormField name="currentStreet2" label="Apt / Suite / Unit">
          <FormInput
            value={data.currentStreet2}
            onChange={(e) => onChange("currentStreet2", e.target.value)}
            autoComplete="address-line2"
            placeholder="Apt 4B"
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField name="currentCity" label="City" required error={errors.currentCity} className="md:col-span-1">
            <FormInput
              value={data.currentCity}
              onChange={(e) => onChange("currentCity", e.target.value)}
              autoComplete="address-level2"
            />
          </FormField>
          <FormField name="currentState" label="State" required error={errors.currentState}>
            <FormSelect
              value={data.currentState}
              onChange={(e) => onChange("currentState", e.target.value)}
              options={US_STATES}
              placeholder="Select state"
              autoComplete="address-level1"
            />
          </FormField>
          <FormField name="currentZip" label="ZIP Code" required error={errors.currentZip}>
            <FormInput
              value={data.currentZip}
              onChange={(e) => onChange("currentZip", formatZip(e.target.value))}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="10001"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection heading="Apartment Viewing">
        <FormField name="viewedApartment" label="Have you viewed an apartment?" required error={errors.viewedApartment}>
          <YesNoToggle
            name="viewedApartment"
            value={data.viewedApartment}
            onChange={(v) => onChange("viewedApartment", v)}
            labels={["Yes, I have", "Not yet"]}
            error={!!errors.viewedApartment}
          />
        </FormField>
        <ConditionalBlock show={data.viewedApartment === "no"}>
          <FormField name="viewingDate" label="Preferred Viewing Date" required error={errors.viewingDate}>
            <FormInput
              type="date"
              value={data.viewingDate}
              onChange={(e) => onChange("viewingDate", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </FormField>
        </ConditionalBlock>
      </FormSection>
    </div>
  );
}

function Step2Assistance({ data, onChange, errors }: StepProps) {
  const isSection8 = SECTION_8_PROGRAMS.includes(data.assistProgram as typeof SECTION_8_PROGRAMS[number]);

  return (
    <div className="flex flex-col gap-0">
      <FormSection heading="Rental Assistance">
        <FormField name="hasAssistance" label="Do you receive rental assistance?" required error={errors.hasAssistance}>
          <YesNoToggle
            name="hasAssistance"
            value={data.hasAssistance}
            onChange={(v) => onChange("hasAssistance", v)}
            error={!!errors.hasAssistance}
          />
        </FormField>

        <ConditionalBlock show={data.hasAssistance === "yes"}>
          <FormField name="assistProgram" label="Assistance Program" required error={errors.assistProgram}>
            <PillSelect
              name="assistProgram"
              value={data.assistProgram}
              onChange={(v) => onChange("assistProgram", v)}
              options={ASSIST_PROGRAM_OPTIONS}
              columns={3}
              error={!!errors.assistProgram}
            />
          </FormField>

          <ConditionalBlock show={data.assistProgram === "Other"}>
            <FormField name="otherProgramName" label="Program Name" required error={errors.otherProgramName}>
              <FormInput
                value={data.otherProgramName}
                onChange={(e) => onChange("otherProgramName", e.target.value)}
                placeholder="Enter program name"
              />
            </FormField>
          </ConditionalBlock>

          <FormField name="voucherBedrooms" label="Voucher Bedrooms" required error={errors.voucherBedrooms}>
            <PillSelect
              name="voucherBedrooms"
              value={data.voucherBedrooms}
              onChange={(v) => onChange("voucherBedrooms", v)}
              options={VOUCHER_BEDROOM_OPTIONS}
              columns={3}
              error={!!errors.voucherBedrooms}
            />
          </FormField>

          <ConditionalBlock show={isSection8}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField name="voucherNumber" label="Voucher/Case Number" required error={errors.voucherNumber}>
                <FormInput
                  value={data.voucherNumber}
                  onChange={(e) => onChange("voucherNumber", sanitizeVoucherCaseNumber(e.target.value))}
                  maxLength={20}
                  placeholder="e.g. 14089043"
                />
              </FormField>
              <FormField name="voucherExpDate" label="Voucher Expiration" required error={errors.voucherExpDate}>
                <FormInput
                  type="date"
                  value={data.voucherExpDate}
                  onChange={(e) => onChange("voucherExpDate", e.target.value)}
                  min={(() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().split("T")[0]; })()}
                />
              </FormField>
            </div>
            <FormField name="isTransferring" label="Are you transferring from another unit?" required error={errors.isTransferring}>
              <YesNoToggle
                name="isTransferring"
                value={data.isTransferring}
                onChange={(v) => onChange("isTransferring", v)}
                error={!!errors.isTransferring}
              />
            </FormField>
          </ConditionalBlock>

          <FormField name="cashAssistActive" label="Do you have active Cash Assistance?" required error={errors.cashAssistActive}>
            <YesNoToggle
              name="cashAssistActive"
              value={data.cashAssistActive}
              onChange={(v) => onChange("cashAssistActive", v)}
              error={!!errors.cashAssistActive}
            />
          </FormField>
        </ConditionalBlock>
      </FormSection>

      <FormSection heading="Current Housing">
        <FormField name="fromShelter" label="Are you currently in a shelter?" required error={errors.fromShelter}>
          <YesNoToggle
            name="fromShelter"
            value={data.fromShelter}
            onChange={(v) => onChange("fromShelter", v)}
            error={!!errors.fromShelter}
          />
        </FormField>

        <ConditionalBlock show={data.fromShelter === "no"}>
          <FormField name="landlordName" label="Current Landlord Name" required error={errors.landlordName}>
            <FormInput
              value={data.landlordName}
              onChange={(e) => onChange("landlordName", e.target.value)}
            />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField name="landlordPhone" label="Landlord Phone" required error={errors.landlordPhone}>
              <FormInput
                value={data.landlordPhone}
                onChange={(e) => onChange("landlordPhone", formatPhone(e.target.value))}
                inputMode="tel"
                placeholder="(555) 555-5555"
              />
            </FormField>
            <FormField name="landlordEmail" label="Landlord Email" error={errors.landlordEmail}>
              <FormInput
                type="email"
                value={data.landlordEmail}
                onChange={(e) => onChange("landlordEmail", e.target.value)}
                placeholder="landlord@example.com"
              />
            </FormField>
          </div>
        </ConditionalBlock>
      </FormSection>

      <FormSection heading="Credit">
        <FormField name="creditScore" label="Credit Score Range" error={errors.creditScore}>
          <PillSelect
            name="creditScore"
            value={data.creditScore}
            onChange={(v) => onChange("creditScore", v)}
            options={CREDIT_SCORE_OPTIONS}
            columns={3}
            allowDeselect
          />
        </FormField>
      </FormSection>
    </div>
  );
}

function Step3Occupants({ data, onChange, errors }: StepProps) {
  const handleOccupantCountChange = useCallback((count: string) => {
    onChange("occupantCount", count);
    const numCount = count === "7+" ? 7 : parseInt(count, 10);
    if (!isNaN(numCount) && numCount > 0) {
      const current = data.occupants;
      if (current.length < numCount) {
        const toAdd = Array.from({ length: numCount - current.length }, () => ({
          id: occupantIdCounter++,
          name: "",
          relationship: "",
          over18: "" as const,
        }));
        onChange("occupants", [...current, ...toAdd]);
      } else if (current.length > numCount) {
        onChange("occupants", current.slice(0, numCount));
      }
    }
  }, [data.occupants, onChange]);

  return (
    <div className="flex flex-col gap-0">
      <FormSection heading="Additional Occupants">
        <FormField name="hasOccupants" label="Will anyone else live with you?" required error={errors.hasOccupants}>
          <YesNoToggle
            name="hasOccupants"
            value={data.hasOccupants}
            onChange={(v) => onChange("hasOccupants", v)}
            error={!!errors.hasOccupants}
          />
        </FormField>

        <ConditionalBlock show={data.hasOccupants === "yes"}>
          <FormField name="occupantCount" label="How many?" required error={errors.occupantCount}>
            <PillSelect
              name="occupantCount"
              value={data.occupantCount}
              onChange={handleOccupantCountChange}
              options={OCCUPANT_COUNT_OPTIONS}
              columns={4}
              error={!!errors.occupantCount}
            />
          </FormField>

          {data.occupants.length > 0 && (
            <RepeaterField<Occupant>
              name="occupants"
              rows={data.occupants}
              onChange={(rows) => onChange("occupants", rows)}
              createRow={() => ({ id: occupantIdCounter++, name: "", relationship: "", over18: "" as const })}
              renderRow={(row, index, onRowChange) => (
                <div className="flex flex-col gap-4">
                  <FormField
                    name={`occupant-${index}-name`}
                    label="Full Name"
                    required
                    error={errors[`occupant-${index}-name`]}
                  >
                    <FormInput
                      value={row.name}
                      onChange={(e) => onRowChange("name", e.target.value)}
                      placeholder="Full name"
                    />
                  </FormField>
                  <FormField
                    name={`occupant-${index}-relationship`}
                    label="Relationship"
                    required
                    error={errors[`occupant-${index}-relationship`]}
                  >
                    <FormInput
                      value={row.relationship}
                      onChange={(e) => onRowChange("relationship", e.target.value)}
                      placeholder="e.g. Spouse, Child, Parent"
                    />
                  </FormField>
                  <FormField
                    name={`occupant-${index}-over18`}
                    label="Age"
                    required
                    error={errors[`occupant-${index}-over18`]}
                  >
                    <YesNoToggle
                      name={`occupant-${index}-over18`}
                      value={row.over18}
                      onChange={(v) => onRowChange("over18", v)}
                      labels={["18 or over", "Under 18"]}
                      error={!!errors[`occupant-${index}-over18`]}
                    />
                  </FormField>
                </div>
              )}
              rowLabel="Occupant"
              minRows={1}
              maxRows={10}
              addLabel="Add Occupant"
            />
          )}
        </ConditionalBlock>
      </FormSection>

      <FormSection heading="Employment">
        <FormField name="currentlyWorking" label="Are you currently employed?" required error={errors.currentlyWorking}>
          <YesNoToggle
            name="currentlyWorking"
            value={data.currentlyWorking}
            onChange={(v) => onChange("currentlyWorking", v)}
            error={!!errors.currentlyWorking}
          />
        </FormField>

        <ConditionalBlock show={data.currentlyWorking === "yes"}>
          <FormField name="employerName" label="Employer Name" required error={errors.employerName}>
            <FormInput
              value={data.employerName}
              onChange={(e) => onChange("employerName", e.target.value)}
            />
          </FormField>
          <FormField name="employerAddress" label="Employer Address" error={errors.employerAddress}>
            <FormInput
              value={data.employerAddress}
              onChange={(e) => onChange("employerAddress", e.target.value)}
            />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField name="supervisorName" label="Supervisor Name" error={errors.supervisorName}>
              <FormInput
                value={data.supervisorName}
                onChange={(e) => onChange("supervisorName", e.target.value)}
              />
            </FormField>
            <FormField name="supervisorPhone" label="Supervisor Phone" error={errors.supervisorPhone}>
              <FormInput
                value={data.supervisorPhone}
                onChange={(e) => onChange("supervisorPhone", formatPhone(e.target.value))}
                inputMode="tel"
                placeholder="(555) 555-5555"
              />
            </FormField>
          </div>

          <FormField name="payType" label="Pay Type" required error={errors.payType}>
            <PillSelect
              name="payType"
              value={data.payType}
              onChange={(v) => onChange("payType", v)}
              options={PAY_TYPE_OPTIONS}
              columns={2}
              error={!!errors.payType}
            />
          </FormField>

          <FormField name="payAmount" label={data.payType === "hourly" ? "Hourly Rate" : "Salary Amount"} required error={errors.payAmount}>
            <FormInput
              prefix="$"
              value={data.payAmount}
              onChange={(e) => onChange("payAmount", e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
            />
          </FormField>

          <ConditionalBlock show={data.payType === "hourly"}>
            <FormField name="hoursPerWeek" label="Hours Per Week" required error={errors.hoursPerWeek}>
              <FormInput
                value={data.hoursPerWeek}
                onChange={(e) => onChange("hoursPerWeek", e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="40"
              />
            </FormField>
          </ConditionalBlock>

          <ConditionalBlock show={data.payType === "salary"}>
            <FormField name="payFrequency" label="Pay Frequency" required error={errors.payFrequency}>
              <PillSelect
                name="payFrequency"
                value={data.payFrequency}
                onChange={(v) => onChange("payFrequency", v)}
                options={PAY_FREQUENCY_OPTIONS}
                columns={2}
                error={!!errors.payFrequency}
              />
            </FormField>
          </ConditionalBlock>
        </ConditionalBlock>
      </FormSection>

      <FormSection heading="Additional Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="isVeteran" label="Are you a veteran?" required error={errors.isVeteran}>
            <YesNoToggle
              name="isVeteran"
              value={data.isVeteran}
              onChange={(v) => onChange("isVeteran", v)}
              error={!!errors.isVeteran}
            />
          </FormField>
          <FormField name="filedTaxes" label="Did you file taxes last year?" required error={errors.filedTaxes}>
            <YesNoToggle
              name="filedTaxes"
              value={data.filedTaxes}
              onChange={(v) => onChange("filedTaxes", v)}
              error={!!errors.filedTaxes}
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

function Step4Income({ data, onChange, errors }: StepProps) {
  const handleIncomeSourceToggle = useCallback((sourceValue: string) => {
    const current = data.incomeSources;
    if (sourceValue === "na") {
      onChange("incomeSources", current.includes("na") ? [] : ["na"]);
    } else {
      const withoutNa = current.filter((s) => s !== "na");
      if (withoutNa.includes(sourceValue)) {
        onChange("incomeSources", withoutNa.filter((s) => s !== sourceValue));
      } else {
        onChange("incomeSources", [...withoutNa, sourceValue]);
      }
    }
  }, [data.incomeSources, onChange]);

  return (
    <div className="flex flex-col gap-0">
      <FormSection heading="Income Sources">
        <div className="flex flex-col gap-2">
          {errors.incomeSources && (
            <p className="text-xs text-error">{errors.incomeSources}</p>
          )}
          {INCOME_SOURCE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={data.incomeSources.includes(opt.value)}
                onChange={() => handleIncomeSourceToggle(opt.value)}
                className="w-5 h-5 rounded accent-primary shrink-0"
              />
              <span className="text-sm text-text-primary">{opt.label}</span>
            </label>
          ))}
        </div>

        <ConditionalBlock show={data.incomeSources.includes("other")}>
          <FormField name="otherIncomeSource" label="Specify Other Income Source" required error={errors.otherIncomeSource}>
            <FormInput
              value={data.otherIncomeSource}
              onChange={(e) => onChange("otherIncomeSource", e.target.value)}
              placeholder="Describe your other income source"
            />
          </FormField>
        </ConditionalBlock>
      </FormSection>

      <FormSection
        heading="Housing Specialist"
        description={
          data.fromShelter === "yes"
            ? "Since you are coming from a shelter, please provide your housing specialist's contact information."
            : "If you have a housing specialist or case worker, provide their contact information."
        }
      >
        <FormField name="housingSpecName" label="Name" required={data.fromShelter === "yes"} error={errors.housingSpecName}>
          <FormInput
            value={data.housingSpecName}
            onChange={(e) => onChange("housingSpecName", e.target.value)}
            placeholder="Full name"
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="housingSpecPhone" label="Phone" required={data.fromShelter === "yes"} error={errors.housingSpecPhone}>
            <FormInput
              value={data.housingSpecPhone}
              onChange={(e) => onChange("housingSpecPhone", formatPhone(e.target.value))}
              inputMode="tel"
              placeholder="(555) 555-5555"
            />
          </FormField>
          <FormField name="housingSpecEmail" label="Email" required={data.fromShelter === "yes"} error={errors.housingSpecEmail}>
            <FormInput
              type="email"
              value={data.housingSpecEmail}
              onChange={(e) => onChange("housingSpecEmail", e.target.value)}
              placeholder="specialist@example.com"
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

function StepDocuments({
  data,
  errors,
  stagedAttachments,
  setStagedAttachments,
}: {
  data: TenantFormData;
  errors: Record<string, string>;
  stagedAttachments: StagedAttachments;
  setStagedAttachments: React.Dispatch<React.SetStateAction<StagedAttachments>>;
}) {
  const visibleCategories = getVisibleDocCategories(data);
  const requiredCategories = getRequiredDocCategories(data);
  const requiredSet = new Set(requiredCategories);
  const adults = getAdultOccupants(data);
  const personOptions = getPersonOptions(data);
  const showPersonPicker = adults.length > 0;

  const requiredLabels = requiredCategories.map((cat) => DOC_CATEGORY_CONFIGS[cat].label);

  return (
    <div className="flex flex-col gap-0">
      <FormSection heading="Required Documents">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-semibold text-text-primary mb-2">
            Please upload the following documents:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {requiredLabels.map((label) => (
              <li key={label} className="text-sm text-text-secondary">{label}</li>
            ))}
          </ul>
          <p className="text-xs text-text-muted mt-3">
            PDF, DOC, JPG, or PNG accepted. Max 25MB per file. Documents are not uploaded until you submit.
          </p>
          {showPersonPicker && (
            <p className="text-xs text-text-secondary mt-3 leading-relaxed">
              <span className="font-semibold">Photo ID</span> and <span className="font-semibold">Social Security Card</span>{" "}
              are required for every adult in the household. After uploading each file, choose whose document it is.
            </p>
          )}
        </div>
      </FormSection>

      <FormSection heading="Upload Documents">
        {visibleCategories.map((cat) => {
          const config = DOC_CATEGORY_CONFIGS[cat];
          const isRequired = requiredSet.has(cat);
          const hasError = !!errors[`doc:${cat}`];
          const isPerPerson = showPersonPicker && PER_PERSON_DOC_CATEGORIES.includes(cat);

          return (
            <FileUpload
              key={cat}
              label={config.label}
              helperText={config.helperText ?? "PDF, images, or Word docs up to 25MB each."}
              required={isRequired}
              error={hasError}
              maxFiles={config.maxFiles}
              stagedFiles={stagedAttachments[cat]}
              personPicker={isPerPerson ? { options: personOptions } : undefined}
              onAssignedToChange={(index, value) =>
                setStagedAttachments((prev) => ({
                  ...prev,
                  [cat]: prev[cat].map((file, i) =>
                    i === index ? { ...file, assignedTo: value } : file,
                  ),
                }))
              }
              onFilesStaged={(files) =>
                setStagedAttachments((prev) => ({
                  ...prev,
                  [cat]: [...prev[cat], ...files],
                }))
              }
              onFileRemoved={(index) =>
                setStagedAttachments((prev) => ({
                  ...prev,
                  [cat]: prev[cat].filter((_, i) => i !== index),
                }))
              }
            />
          );
        })}
        {showPersonPicker && errors[`doc:photoId`] && (
          <p className="text-xs text-error mt-1">{errors[`doc:photoId`]}</p>
        )}
        {showPersonPicker && errors[`doc:socialSecurityCard`] && (
          <p className="text-xs text-error mt-1">{errors[`doc:socialSecurityCard`]}</p>
        )}
      </FormSection>
    </div>
  );
}

function Step5Payment({ data, onChange }: StepProps) {
  return (
    <PaymentStep
      confirmed={data.paymentConfirmed}
      onConfirmChange={(v) => {
        onChange("paymentConfirmed", v);
      }}
    />
  );
}

function Step6Auth({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-0">
      <FormSection heading="Lifestyle">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="isSmoker" label="Do you smoke?" required error={errors.isSmoker}>
            <YesNoToggle
              name="isSmoker"
              value={data.isSmoker}
              onChange={(v) => onChange("isSmoker", v)}
              error={!!errors.isSmoker}
            />
          </FormField>
          <FormField name="hasPets" label="Do you have pets?" required error={errors.hasPets}>
            <YesNoToggle
              name="hasPets"
              value={data.hasPets}
              onChange={(v) => onChange("hasPets", v)}
              error={!!errors.hasPets}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection heading="Disclosure">
        <div className="max-h-[200px] overflow-y-auto rounded-lg bg-surface p-4 text-sm text-text-secondary leading-relaxed">
          I, the undersigned applicant, hereby authorize ItsRellEstate and Nyrell Nunez to verify
          any and all information provided in this application, including but not limited to
          employment history, rental history, credit history, and public records. I understand that
          providing false or misleading information may result in denial of my application. I
          acknowledge that a non-refundable $20 processing fee is required and that submission of
          this application does not guarantee housing placement. I agree to cooperate with all
          requests for additional documentation needed to process my application.
        </div>

        <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={data.disclosureAgreed}
            onChange={(e) => onChange("disclosureAgreed", e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
            aria-invalid={errors.disclosureAgreed ? true : undefined}
          />
          <span className="text-sm text-text-primary">
            I have read and agree to the above disclosure
          </span>
        </label>
        {errors.disclosureAgreed && (
          <p className="text-xs text-error">{errors.disclosureAgreed}</p>
        )}
      </FormSection>

      <FormSection heading="Electronic Signature" description="Your typed name serves as your electronic signature.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="signatureFirst" label="First Name" required error={errors.signatureFirst}>
            <FormInput
              value={data.signatureFirst}
              onChange={(e) => onChange("signatureFirst", e.target.value)}
              placeholder={data.firstName || "First name"}
            />
          </FormField>
          <FormField name="signatureLast" label="Last Name" required error={errors.signatureLast}>
            <FormInput
              value={data.signatureLast}
              onChange={(e) => onChange("signatureLast", e.target.value)}
              placeholder={data.lastName || "Last name"}
            />
          </FormField>
        </div>

        {(data.signatureFirst || data.signatureLast) && (
          <div className="border-b-2 border-text-primary/20 pb-2 mt-4">
            <p className="text-2xl italic text-text-primary">
              {data.signatureFirst} {data.signatureLast}
            </p>
          </div>
        )}
      </FormSection>
    </div>
  );
}
