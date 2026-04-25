"use client";

import { useState, useCallback, useEffect } from "react";
import { FormWizard, useWizardContext } from "@/components/forms/form-wizard";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormInput, FormSelect } from "@/components/forms/form-input";
import { PillSelect } from "@/components/forms/pill-select";
import { YesNoToggle } from "@/components/forms/yes-no-toggle";
import { RepeaterField } from "@/components/forms/repeater-field";
import { ConditionalBlock } from "@/components/forms/conditional-block";
import { FormSuccess } from "@/components/forms/form-success";
import { FileUpload, type StagedFile } from "@/components/forms/file-upload";
import type { FormStepDef, LandlordFormData, RentalUnit } from "@/lib/form-types";
import { createEmptyLandlordForm } from "@/lib/form-types";
import {
  validateLandlordStep1,
  validateLandlordStep2,
  validateLandlordStep3,
  validateLandlordStep4,
  validateLandlordStep5,
  validateLandlordStep6,
} from "@/lib/form-step-validators";
import { formatPhone, formatZip, formatEIN, formatSSN, formatCurrency } from "@/lib/form-formatters";
import {
  US_STATES,
  OWNERSHIP_TYPE_OPTIONS,
  BANK_OPTIONS,
  PAYMENT_PREFERENCE_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  YEAR_BUILT_OPTIONS,
  STORIES_OPTIONS,
  FLOOR_OPTIONS,
  UNIT_BEDROOM_OPTIONS,
  SUBMITTER_TITLE_OPTIONS,
  UTIL_HEATING_OPTIONS,
  UTIL_COOKING_OPTIONS,
  UTIL_HOT_WATER_OPTIONS,
  UTIL_ELECTRIC_OPTIONS,
  UTIL_WATER_OPTIONS,
  UTIL_SEWER_OPTIONS,
  UTIL_TRASH_OPTIONS,
  UTIL_AC_OPTIONS,
} from "@/lib/form-constants";
import { LANDLORD_STORAGE_KEY, markSubmitted, getSubmitted } from "@/lib/form-storage";

const STEPS: FormStepDef[] = [
  {
    id: "property",
    label: "Property & Ownership",
    shortLabel: "Property",
    validate: (d) => validateLandlordStep1(d as unknown as LandlordFormData),
  },
  {
    id: "contact",
    label: "Contact & Mailing",
    shortLabel: "Contact",
    validate: (d) => validateLandlordStep2(d as unknown as LandlordFormData),
  },
  {
    id: "building",
    label: "Building & Utilities",
    shortLabel: "Building",
    validate: (d) => validateLandlordStep3(d as unknown as LandlordFormData),
  },
  {
    id: "units",
    label: "Units for Rent",
    shortLabel: "Units",
    validate: (d) => validateLandlordStep4(d as unknown as LandlordFormData),
  },
  {
    id: "documents",
    label: "Documents",
    shortLabel: "Docs",
    validate: () => ({}),
  },
  {
    id: "payments",
    label: "Payments & POC",
    shortLabel: "Payments",
    validate: (d) => validateLandlordStep5(d as unknown as LandlordFormData),
  },
  {
    id: "signature",
    label: "Review & Submit",
    shortLabel: "Submit",
    validate: (d) => validateLandlordStep6(d as unknown as LandlordFormData),
  },
];

let unitIdCounter = 2;

async function uploadStagedFiles(
  files: StagedFile[],
  uploadsFolderId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const staged = files[i];
    const formData = new FormData();
    formData.append("file", staged.file);
    formData.append("folderId", uploadsFolderId);
    await fetch("/api/upload", { method: "POST", body: formData });
  }
}

export function LandlordForm() {
  const [data, setData] = useState<LandlordFormData>(createEmptyLandlordForm);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedName, setSubmittedName] = useState("");

  useEffect(() => {
    const prev = getSubmitted(LANDLORD_STORAGE_KEY);
    if (prev) {
      setSubmittedName(prev.firstName);
      setIsSubmitted(true);
    }
  }, []);

  const handleChange = useCallback((field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBulkRestore = useCallback((restored: Record<string, unknown>) => {
    setData(restored as unknown as LandlordFormData);
  }, []);

  const handleFilesStaged = useCallback((files: StagedFile[]) => {
    setStagedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileRemoved = useCallback((index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/apply/landlord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Submission failed");
      }
      const result = await res.json();

      if (stagedFiles.length > 0 && result.uploadsFolderId) {
        await uploadStagedFiles(
          stagedFiles,
          result.uploadsFolderId,
          (current, total) => setSubmitProgress(`Uploading ${current} of ${total} files...`),
        );
      }

      markSubmitted(LANDLORD_STORAGE_KEY, data.llFirstName);
      setIsSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  }, [data, stagedFiles]);

  if (isSubmitted) {
    return <FormSuccess type="landlord" firstName={submittedName || data.llFirstName} />;
  }

  return (
    <FormWizard
      steps={STEPS}
      data={data as unknown as Record<string, unknown>}
      onChange={handleChange}
      onBulkRestore={handleBulkRestore}
      renderStep={(stepIndex) => (
        <LandlordStep
          step={stepIndex}
          data={data}
          stagedFiles={stagedFiles}
          onFilesStaged={handleFilesStaged}
          onFileRemoved={handleFileRemoved}
        />
      )}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitProgress={submitProgress}
      submitError={submitError}
      storageKey={LANDLORD_STORAGE_KEY}
      title="Landlord Application"
    />
  );
}

function LandlordStep({
  step,
  data,
  stagedFiles,
  onFilesStaged,
  onFileRemoved,
}: {
  step: number;
  data: LandlordFormData;
  stagedFiles: StagedFile[];
  onFilesStaged: (files: StagedFile[]) => void;
  onFileRemoved: (index: number) => void;
}) {
  const { errors, onChange } = useWizardContext();

  switch (step) {
    case 0:
      return <Step1PropertyOwnership data={data} onChange={onChange} errors={errors} />;
    case 1:
      return <Step2MailingContact data={data} onChange={onChange} errors={errors} />;
    case 2:
      return <Step3BuildingUtilities data={data} onChange={onChange} errors={errors} />;
    case 3:
      return <Step4Units data={data} onChange={onChange} errors={errors} />;
    case 4:
      return (
        <StepDocuments
          stagedFiles={stagedFiles}
          onFilesStaged={onFilesStaged}
          onFileRemoved={onFileRemoved}
        />
      );
    case 5:
      return <Step5PaymentsPOC data={data} onChange={onChange} errors={errors} />;
    case 6:
      return <Step6Signature data={data} onChange={onChange} errors={errors} />;
    default:
      return null;
  }
}

interface StepProps {
  data: LandlordFormData;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

/* ---------- Step: Documents ---------- */

function StepDocuments({
  stagedFiles,
  onFilesStaged,
  onFileRemoved,
}: {
  stagedFiles: StagedFile[];
  onFilesStaged: (files: StagedFile[]) => void;
  onFileRemoved: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FormSection
        heading="Supporting Documents"
        description="Upload any documents related to your property listing. These are securely stored and only accessible to the agent. Documents are not uploaded until you submit."
      >
        <FileUpload
          label="Documents"
          helperText="Deed, lease templates, proof of ownership, HPD registration, or any other supporting documents. PDF, DOC, JPG, or PNG accepted."
          stagedFiles={stagedFiles}
          onFilesStaged={onFilesStaged}
          onFileRemoved={onFileRemoved}
        />
      </FormSection>
    </div>
  );
}

/* ---------- Step 1: Property Address + Legal Ownership + Banking ---------- */

function Step1PropertyOwnership({ data, onChange, errors }: StepProps) {
  const isIndividual = data.ownershipType === "individual";
  const hasOwnershipType = data.ownershipType !== "";
  const isElectronic = data.paymentPreference === "electronic";

  return (
    <div className="flex flex-col gap-6">
      <FormSection heading="Property Address">
        <FormField name="propAddress" label="Street Address" required error={errors.propAddress}>
          <FormInput
            value={data.propAddress}
            onChange={(e) => onChange("propAddress", e.target.value)}
            placeholder="123 Main Street"
          />
        </FormField>

        <FormField name="propAddress2" label="Address Line 2" error={errors.propAddress2}>
          <FormInput
            value={data.propAddress2}
            onChange={(e) => onChange("propAddress2", e.target.value)}
            placeholder="Apt, Suite, Floor"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField name="propCity" label="City" required error={errors.propCity} className="md:col-span-2">
            <FormInput
              value={data.propCity}
              onChange={(e) => onChange("propCity", e.target.value)}
              placeholder="New York"
            />
          </FormField>

          <FormField name="propState" label="State" required error={errors.propState}>
            <FormSelect
              value={data.propState}
              onChange={(e) => onChange("propState", e.target.value)}
              options={US_STATES}
              placeholder="Select state"
            />
          </FormField>
        </div>

        <FormField name="propZip" label="ZIP Code" required error={errors.propZip}>
          <FormInput
            value={data.propZip}
            onChange={(e) => onChange("propZip", formatZip(e.target.value))}
            placeholder="10001"
            inputMode="numeric"
          />
        </FormField>
      </FormSection>

      <FormSection heading="Legal Ownership">
        <FormField name="ownershipType" label="Ownership Type" required error={errors.ownershipType}>
          <FormSelect
            value={data.ownershipType}
            onChange={(e) => onChange("ownershipType", e.target.value)}
            options={OWNERSHIP_TYPE_OPTIONS}
            placeholder="Select type"
          />
        </FormField>

        <ConditionalBlock show={hasOwnershipType}>
          <FormField
            name="taxId"
            label={isIndividual ? "Social Security Number" : "EIN (Employer Identification Number)"}
            required
            error={errors.taxId}
          >
            <FormInput
              value={data.taxId}
              onChange={(e) =>
                onChange(
                  "taxId",
                  isIndividual ? formatSSN(e.target.value) : formatEIN(e.target.value),
                )
              }
              placeholder={isIndividual ? "000-00-0000" : "00-0000000"}
              inputMode="numeric"
            />
          </FormField>

          {isIndividual ? (
            <FormField name="legalName" label="Legal Full Name" required error={errors.legalName}>
              <FormInput
                value={data.legalName}
                onChange={(e) => onChange("legalName", e.target.value)}
                placeholder="As it appears on tax documents"
              />
            </FormField>
          ) : (
            <FormField
              name="legalBusinessName"
              label="Legal Business Name"
              required
              error={errors.legalBusinessName}
            >
              <FormInput
                value={data.legalBusinessName}
                onChange={(e) => onChange("legalBusinessName", e.target.value)}
                placeholder="As registered with the state"
              />
            </FormField>
          )}
        </ConditionalBlock>
      </FormSection>

      <FormSection heading="Payment Preference">
        <FormField name="paymentPreference" label="How would you like to receive payments from agencies?" required error={errors.paymentPreference}>
          <PillSelect
            name="paymentPreference"
            value={data.paymentPreference}
            onChange={(v) => onChange("paymentPreference", v)}
            options={PAYMENT_PREFERENCE_OPTIONS}
            columns={2}
            error={!!errors.paymentPreference}
          />
        </FormField>

        <ConditionalBlock show={isElectronic}>
          <FormField name="bankName" label="Bank Name" required error={errors.bankName}>
            <FormSelect
              value={data.bankName}
              onChange={(e) => onChange("bankName", e.target.value)}
              options={BANK_OPTIONS}
              placeholder="Select bank"
            />
          </FormField>

          <ConditionalBlock show={data.bankName === "other"}>
            <FormField name="bankNameOther" label="Bank Name (Other)" required error={errors.bankNameOther}>
              <FormInput
                value={data.bankNameOther}
                onChange={(e) => onChange("bankNameOther", e.target.value)}
                placeholder="Enter bank name"
              />
            </FormField>
          </ConditionalBlock>

          <FormField name="accountType" label="Account Type" required error={errors.accountType}>
            <PillSelect
              name="accountType"
              value={data.accountType}
              onChange={(v) => onChange("accountType", v)}
              options={ACCOUNT_TYPE_OPTIONS}
              columns={2}
              error={!!errors.accountType}
            />
          </FormField>

          <FormField name="accountName" label="Name on Account" required error={errors.accountName}>
            <FormInput
              value={data.accountName}
              onChange={(e) => onChange("accountName", e.target.value)}
              placeholder="Full name as it appears on account"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField name="bankAcct" label="Account Number" required error={errors.bankAcct}>
              <FormInput
                value={data.bankAcct}
                onChange={(e) => onChange("bankAcct", e.target.value)}
                inputMode="numeric"
              />
            </FormField>

            <FormField name="bankAcctConfirm" label="Confirm Account Number" required error={errors.bankAcctConfirm}>
              <FormInput
                value={data.bankAcctConfirm}
                onChange={(e) => onChange("bankAcctConfirm", e.target.value)}
                inputMode="numeric"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField name="bankRouting" label="Routing Number" required error={errors.bankRouting}>
              <FormInput
                value={data.bankRouting}
                onChange={(e) => onChange("bankRouting", e.target.value)}
                inputMode="numeric"
              />
            </FormField>

            <FormField name="bankRoutingConfirm" label="Confirm Routing Number" required error={errors.bankRoutingConfirm}>
              <FormInput
                value={data.bankRoutingConfirm}
                onChange={(e) => onChange("bankRoutingConfirm", e.target.value)}
                inputMode="numeric"
              />
            </FormField>
          </div>
        </ConditionalBlock>
      </FormSection>
    </div>
  );
}

/* ---------- Step 2: Mailing Address + Contact + Auth Rep ---------- */

function Step2MailingContact({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <FormSection heading="Mailing Address">
        <FormField name="mailAddress" label="Street Address" required error={errors.mailAddress}>
          <FormInput
            value={data.mailAddress}
            onChange={(e) => onChange("mailAddress", e.target.value)}
            placeholder="123 Main Street"
          />
        </FormField>

        <FormField name="mailAddress2" label="Address Line 2" error={errors.mailAddress2}>
          <FormInput
            value={data.mailAddress2}
            onChange={(e) => onChange("mailAddress2", e.target.value)}
            placeholder="Apt, Suite, Floor"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField name="mailCity" label="City" required error={errors.mailCity} className="md:col-span-2">
            <FormInput
              value={data.mailCity}
              onChange={(e) => onChange("mailCity", e.target.value)}
              placeholder="New York"
            />
          </FormField>

          <FormField name="mailState" label="State" required error={errors.mailState}>
            <FormSelect
              value={data.mailState}
              onChange={(e) => onChange("mailState", e.target.value)}
              options={US_STATES}
              placeholder="Select state"
            />
          </FormField>
        </div>

        <FormField name="mailZip" label="ZIP Code" required error={errors.mailZip}>
          <FormInput
            value={data.mailZip}
            onChange={(e) => onChange("mailZip", formatZip(e.target.value))}
            placeholder="10001"
            inputMode="numeric"
          />
        </FormField>
      </FormSection>

      <FormSection heading="Owner/Manager Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="llFirstName" label="First Name" required error={errors.llFirstName}>
            <FormInput
              value={data.llFirstName}
              onChange={(e) => onChange("llFirstName", e.target.value)}
              placeholder="First name"
            />
          </FormField>

          <FormField name="llLastName" label="Last Name" required error={errors.llLastName}>
            <FormInput
              value={data.llLastName}
              onChange={(e) => onChange("llLastName", e.target.value)}
              placeholder="Last name"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="llPhone" label="Phone Number" required error={errors.llPhone}>
            <FormInput
              value={data.llPhone}
              onChange={(e) => onChange("llPhone", formatPhone(e.target.value))}
              placeholder="(555) 123-4567"
              type="tel"
              inputMode="tel"
            />
          </FormField>

          <FormField name="llEmail" label="Email Address" required error={errors.llEmail}>
            <FormInput
              value={data.llEmail}
              onChange={(e) => onChange("llEmail", e.target.value)}
              placeholder="email@example.com"
              type="email"
              inputMode="email"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection heading="Authorized Representative">
        <FormField
          name="hasAuthRep"
          label="Do you have an authorized representative?"
          required
          error={errors.hasAuthRep}
        >
          <YesNoToggle
            name="hasAuthRep"
            value={data.hasAuthRep}
            onChange={(v) => onChange("hasAuthRep", v)}
            error={!!errors.hasAuthRep}
          />
        </FormField>

        <ConditionalBlock show={data.hasAuthRep === "yes"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField name="authRepFirst" label="First Name" required error={errors.authRepFirst}>
              <FormInput
                value={data.authRepFirst}
                onChange={(e) => onChange("authRepFirst", e.target.value)}
                placeholder="First name"
              />
            </FormField>

            <FormField name="authRepLast" label="Last Name" required error={errors.authRepLast}>
              <FormInput
                value={data.authRepLast}
                onChange={(e) => onChange("authRepLast", e.target.value)}
                placeholder="Last name"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField name="authRepPhone" label="Phone Number" required error={errors.authRepPhone}>
              <FormInput
                value={data.authRepPhone}
                onChange={(e) => onChange("authRepPhone", formatPhone(e.target.value))}
                placeholder="(555) 123-4567"
                type="tel"
                inputMode="tel"
              />
            </FormField>

            <FormField name="authRepEmail" label="Email Address" required error={errors.authRepEmail}>
              <FormInput
                value={data.authRepEmail}
                onChange={(e) => onChange("authRepEmail", e.target.value)}
                placeholder="email@example.com"
                type="email"
                inputMode="email"
              />
            </FormField>
          </div>
        </ConditionalBlock>
      </FormSection>
    </div>
  );
}

/* ---------- Step 3: Building Details + Utilities ---------- */

function Step3BuildingUtilities({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <FormSection heading="Building Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="yearBuilt" label="Year Built" required error={errors.yearBuilt}>
            <FormSelect
              value={data.yearBuilt}
              onChange={(e) => onChange("yearBuilt", e.target.value)}
              options={YEAR_BUILT_OPTIONS}
              placeholder="Select year"
            />
          </FormField>

          <FormField name="totalStories" label="Total Stories" required error={errors.totalStories}>
            <FormSelect
              value={data.totalStories}
              onChange={(e) => onChange("totalStories", e.target.value)}
              options={STORIES_OPTIONS}
              placeholder="Select stories"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            name="residentialUnits"
            label="Residential Units"
            required
            error={errors.residentialUnits}
          >
            <FormInput
              value={data.residentialUnits}
              onChange={(e) => onChange("residentialUnits", e.target.value)}
              placeholder="Total residential units"
              inputMode="numeric"
            />
          </FormField>

          <FormField
            name="commercialUnits"
            label="Commercial Units"
            error={errors.commercialUnits}
          >
            <FormInput
              value={data.commercialUnits}
              onChange={(e) => onChange("commercialUnits", e.target.value)}
              placeholder="0 if none"
              inputMode="numeric"
            />
          </FormField>
        </div>

        <FormField
          name="rentStabilized"
          label="Is the building rent stabilized?"
          required
          error={errors.rentStabilized}
        >
          <YesNoToggle
            name="rentStabilized"
            value={data.rentStabilized}
            onChange={(v) => onChange("rentStabilized", v)}
            error={!!errors.rentStabilized}
          />
        </FormField>
      </FormSection>

      <FormSection
        heading="Utilities"
        description="Select who is responsible for each utility."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="utilHeating" label="Heating" required error={errors.utilHeating}>
            <FormSelect
              value={data.utilHeating}
              onChange={(e) => onChange("utilHeating", e.target.value)}
              options={UTIL_HEATING_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilCooking" label="Cooking" required error={errors.utilCooking}>
            <FormSelect
              value={data.utilCooking}
              onChange={(e) => onChange("utilCooking", e.target.value)}
              options={UTIL_COOKING_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilHotWater" label="Hot Water" required error={errors.utilHotWater}>
            <FormSelect
              value={data.utilHotWater}
              onChange={(e) => onChange("utilHotWater", e.target.value)}
              options={UTIL_HOT_WATER_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilElectric" label="Electricity" required error={errors.utilElectric}>
            <FormSelect
              value={data.utilElectric}
              onChange={(e) => onChange("utilElectric", e.target.value)}
              options={UTIL_ELECTRIC_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilWater" label="Water" required error={errors.utilWater}>
            <FormSelect
              value={data.utilWater}
              onChange={(e) => onChange("utilWater", e.target.value)}
              options={UTIL_WATER_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilSewer" label="Sewer" required error={errors.utilSewer}>
            <FormSelect
              value={data.utilSewer}
              onChange={(e) => onChange("utilSewer", e.target.value)}
              options={UTIL_SEWER_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilTrash" label="Trash" required error={errors.utilTrash}>
            <FormSelect
              value={data.utilTrash}
              onChange={(e) => onChange("utilTrash", e.target.value)}
              options={UTIL_TRASH_OPTIONS}
              placeholder="Select option"
            />
          </FormField>

          <FormField name="utilAC" label="Air Conditioning" required error={errors.utilAC}>
            <FormSelect
              value={data.utilAC}
              onChange={(e) => onChange("utilAC", e.target.value)}
              options={UTIL_AC_OPTIONS}
              placeholder="Select option"
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

/* ---------- Step 4: Units for Rent ---------- */

function Step4Units({ data, onChange, errors }: StepProps) {
  const createUnit = useCallback((): RentalUnit => {
    const id = unitIdCounter++;
    return { id, unitNumber: "", floor: "", bedrooms: "", rent: "" };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <FormSection heading="Units for Rent" description="Add each unit you would like to list.">
        {errors.units && (
          <p className="text-sm text-error" role="alert">{errors.units}</p>
        )}

        <RepeaterField<RentalUnit>
          name="units"
          rows={data.units}
          onChange={(rows) => onChange("units", rows)}
          createRow={createUnit}
          renderRow={(row, index, onRowChange) => (
            <UnitRow row={row} index={index} onRowChange={onRowChange} errors={errors} />
          )}
          rowLabel="Unit"
          minRows={1}
          maxRows={20}
          addLabel="Add Unit"
        />
      </FormSection>
    </div>
  );
}

function UnitRow({
  row,
  index,
  onRowChange,
  errors,
}: {
  row: RentalUnit;
  index: number;
  onRowChange: (field: keyof RentalUnit, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          name={`unit-${index}-unitNumber`}
          label="Unit Number"
          required
          error={errors[`unit-${index}-unitNumber`]}
        >
          <FormInput
            value={row.unitNumber}
            onChange={(e) => onRowChange("unitNumber", e.target.value)}
            placeholder="e.g. 1A, 2B"
          />
        </FormField>

        <FormField
          name={`unit-${index}-floor`}
          label="Floor"
          required
          error={errors[`unit-${index}-floor`]}
        >
          <FormSelect
            value={row.floor}
            onChange={(e) => onRowChange("floor", e.target.value)}
            options={FLOOR_OPTIONS}
            placeholder="Select floor"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          name={`unit-${index}-bedrooms`}
          label="Bedrooms"
          required
          error={errors[`unit-${index}-bedrooms`]}
        >
          <FormSelect
            value={row.bedrooms}
            onChange={(e) => onRowChange("bedrooms", e.target.value)}
            options={UNIT_BEDROOM_OPTIONS}
            placeholder="Select bedrooms"
          />
        </FormField>

        <FormField
          name={`unit-${index}-rent`}
          label="Monthly Rent"
          required
          error={errors[`unit-${index}-rent`]}
        >
          <FormInput
            prefix="$"
            value={row.rent}
            onChange={(e) => onRowChange("rent", formatCurrency(e.target.value))}
            placeholder="0.00"
            inputMode="decimal"
          />
        </FormField>
      </div>
    </div>
  );
}

/* ---------- Step 5: Tenant Payment Methods + POC ---------- */

function Step5PaymentsPOC({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <FormSection
        heading="Accepted Payment Methods"
        description="Select which payment methods you accept from tenants."
      >
        {errors.paymentMethod && (
          <p className="text-sm text-error" role="alert">{errors.paymentMethod}</p>
        )}

        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={data.payCheck}
              onChange={(e) => onChange("payCheck", e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
            />
            <span className="text-sm font-medium text-text-primary">Check / Money Order</span>
          </label>

          <ConditionalBlock show={data.payCheck}>
            <FormField name="checkPayable" label="Payable To" required error={errors.checkPayable}>
              <FormInput
                value={data.checkPayable}
                onChange={(e) => onChange("checkPayable", e.target.value)}
                placeholder="Name on check"
              />
            </FormField>

            <FormField name="checkAddress" label="Mailing Address" required error={errors.checkAddress}>
              <FormInput
                value={data.checkAddress}
                onChange={(e) => onChange("checkAddress", e.target.value)}
                placeholder="Street address"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FormField name="checkCity" label="City" required error={errors.checkCity} className="md:col-span-2">
                <FormInput
                  value={data.checkCity}
                  onChange={(e) => onChange("checkCity", e.target.value)}
                  placeholder="City"
                />
              </FormField>

              <FormField name="checkState" label="State" required error={errors.checkState}>
                <FormSelect
                  value={data.checkState}
                  onChange={(e) => onChange("checkState", e.target.value)}
                  options={US_STATES}
                  placeholder="State"
                />
              </FormField>
            </div>

            <FormField name="checkZip" label="ZIP Code" required error={errors.checkZip}>
              <FormInput
                value={data.checkZip}
                onChange={(e) => onChange("checkZip", formatZip(e.target.value))}
                placeholder="10001"
                inputMode="numeric"
              />
            </FormField>
          </ConditionalBlock>

          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={data.payZelle}
              onChange={(e) => onChange("payZelle", e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
            />
            <span className="text-sm font-medium text-text-primary">Zelle</span>
          </label>

          <ConditionalBlock show={data.payZelle}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField name="zellePhone" label="Zelle Phone" required error={errors.zellePhone}>
                <FormInput
                  value={data.zellePhone}
                  onChange={(e) => onChange("zellePhone", formatPhone(e.target.value))}
                  placeholder="(555) 123-4567"
                  type="tel"
                  inputMode="tel"
                />
              </FormField>

              <FormField name="zelleEmail" label="Zelle Email" error={errors.zelleEmail}>
                <FormInput
                  value={data.zelleEmail}
                  onChange={(e) => onChange("zelleEmail", e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  inputMode="email"
                />
              </FormField>
            </div>
          </ConditionalBlock>

          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={data.payACH}
              onChange={(e) => onChange("payACH", e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
            />
            <span className="text-sm font-medium text-text-primary">ACH / Direct Deposit</span>
          </label>

          <ConditionalBlock show={data.payACH}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField name="achAccount" label="Account Number" required error={errors.achAccount}>
                <FormInput
                  value={data.achAccount}
                  onChange={(e) => onChange("achAccount", e.target.value)}
                  inputMode="numeric"
                />
              </FormField>

              <FormField name="achRouting" label="Routing Number" required error={errors.achRouting}>
                <FormInput
                  value={data.achRouting}
                  onChange={(e) => onChange("achRouting", e.target.value)}
                  inputMode="numeric"
                />
              </FormField>
            </div>
          </ConditionalBlock>
        </div>
      </FormSection>

      <FormSection
        heading="Point of Contact"
        description="Who should tenants contact for maintenance and inquiries?"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="pocFirstName" label="First Name" required error={errors.pocFirstName}>
            <FormInput
              value={data.pocFirstName}
              onChange={(e) => onChange("pocFirstName", e.target.value)}
              placeholder="First name"
            />
          </FormField>

          <FormField name="pocLastName" label="Last Name" required error={errors.pocLastName}>
            <FormInput
              value={data.pocLastName}
              onChange={(e) => onChange("pocLastName", e.target.value)}
              placeholder="Last name"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="pocPhone" label="Phone Number" required error={errors.pocPhone}>
            <FormInput
              value={data.pocPhone}
              onChange={(e) => onChange("pocPhone", formatPhone(e.target.value))}
              placeholder="(555) 123-4567"
              type="tel"
              inputMode="tel"
            />
          </FormField>

          <FormField name="pocEmail" label="Email Address" required error={errors.pocEmail}>
            <FormInput
              value={data.pocEmail}
              onChange={(e) => onChange("pocEmail", e.target.value)}
              placeholder="email@example.com"
              type="email"
              inputMode="email"
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

/* ---------- Step 6: Submission + Signature ---------- */

function Step6Signature({ data, onChange, errors }: StepProps) {
  const signatureDisplay =
    data.signatureFirst || data.signatureLast
      ? `${data.signatureFirst} ${data.signatureLast}`.trim()
      : "";

  return (
    <div className="flex flex-col gap-6">
      <FormSection heading="Submitter Information">
        <FormField name="submitterTitle" label="Your Title" required error={errors.submitterTitle}>
          <FormSelect
            value={data.submitterTitle}
            onChange={(e) => onChange("submitterTitle", e.target.value)}
            options={SUBMITTER_TITLE_OPTIONS}
            placeholder="Select title"
          />
        </FormField>
      </FormSection>

      <FormSection heading="Agreement">
        <div className="max-h-[200px] overflow-y-auto rounded-lg bg-surface p-4 text-sm text-text-secondary leading-relaxed">
          I certify that all information provided in this application is true
          and accurate to the best of my knowledge. I understand that providing
          false information may result in disqualification. I authorize
          ItsRellEstate and Nyrell Nunez to verify any information provided and
          to share relevant details with prospective tenants as needed for the
          matching process.
        </div>

        <FormField
          name="agreementConfirmed"
          label="Agreement Confirmation"
          error={errors.agreementConfirmed}
        >
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={data.agreementConfirmed}
              onChange={(e) => onChange("agreementConfirmed", e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
              id="agreementConfirmed"
              aria-invalid={errors.agreementConfirmed ? true : undefined}
            />
            <span className="text-sm font-medium text-text-primary">
              I have read and agree to the terms above.
            </span>
          </label>
        </FormField>
      </FormSection>

      <FormSection heading="Electronic Signature">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField name="signatureFirst" label="First Name" required error={errors.signatureFirst}>
            <FormInput
              value={data.signatureFirst}
              onChange={(e) => onChange("signatureFirst", e.target.value)}
              placeholder="First name"
            />
          </FormField>

          <FormField name="signatureLast" label="Last Name" required error={errors.signatureLast}>
            <FormInput
              value={data.signatureLast}
              onChange={(e) => onChange("signatureLast", e.target.value)}
              placeholder="Last name"
            />
          </FormField>
        </div>

        {signatureDisplay && (
          <div className="border-b-2 border-text-primary/20 pb-2 mt-4">
            <p className="text-2xl text-text-primary italic font-sans">
              {signatureDisplay}
            </p>
          </div>
        )}
      </FormSection>
    </div>
  );
}
