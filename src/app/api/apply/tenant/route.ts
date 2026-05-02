import { NextResponse } from "next/server";
import {
  getOrCreateApplicantFolder,
  saveApplicationJSON,
  appendSheetRow,
  appendStripeColumnsToRow,
  sendNotificationEmail,
  patchFolderProperties,
  getFolderProperties,
} from "@/lib/google";
import { createApplicationInvoice } from "@/lib/stripe";
import { tenantSchema, sanitizeForStorage } from "@/lib/validation";
import { upsertTenantContact } from "@/lib/contacts";

export const runtime = "nodejs";

const IDEMPOTENCY_KEY_RE = /^[a-zA-Z0-9_-]{8,128}$/;

function pathLabelFor(value: string): string {
  switch (value) {
    case "voucher": return "Voucher / Subsidy";
    case "out-of-pocket": return "Out of Pocket";
    case "other": return "Other";
    default: return "—";
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
      return NextResponse.json(
        { error: "Missing or invalid Idempotency-Key" },
        { status: 400 },
      );
    }

    const raw = await request.json();
    const parsed = tenantSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const tenantFolderId = process.env.GOOGLE_TENANT_FOLDER_ID;
    if (!tenantFolderId) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const applicantName = `${body.firstName} ${body.lastName}`.trim();
    const timestamp = new Date().toISOString();

    const over18Names = body.occupants
      .filter((o) => o.over18 === "yes" && o.name.trim())
      .map((o) => o.name.trim());

    const { folderId, folderLink, folderName, uploadsFolderId, occupantFolderIds, alreadyExisted } =
      await getOrCreateApplicantFolder(
        tenantFolderId,
        applicantName,
        "tenant",
        idempotencyKey,
        over18Names,
      );

    // Stable application id matches the encoding the CMS uses to derive
    // ids from Drive folder names. Used for contacts upsert below.
    const applicationId = encodeURIComponent(
      folderName.replace(/\s+/g, "_"),
    );

    const dataForStorage = { ...body, submittedAt: timestamp };
    delete (dataForStorage as Record<string, unknown>).paymentConfirmed;
    const sanitized = sanitizeForStorage(dataForStorage);
    await saveApplicationJSON(folderId, sanitized);

    const folderProps = alreadyExisted ? await getFolderProperties(folderId) : {};

    if (!folderProps.sheetRowAppended) {
      const occupantsDetail = body.occupants
        .map((o) => `${o.name} (${o.relationship}, ${o.over18 === "yes" ? "18+" : "under 18"})`)
        .join("; ");

      const incomeSources = Array.isArray(body.incomeSources)
        ? body.incomeSources.join(", ")
        : "";

      const { rowNumber } = await appendSheetRow("Tenant Applications", [
        timestamp,
        "",
        "Unpaid",
        body.firstName,
        body.lastName,
        body.dateOfBirth,
        body.cellPhone,
        body.email,
        body.emergencyContactName,
        body.emergencyContactPhone,
        body.preferredBorough,
        `${body.currentStreet}${body.currentStreet2 ? ` ${body.currentStreet2}` : ""}`,
        body.currentCity,
        body.currentState,
        body.currentZip,
        body.viewedApartment,
        body.viewingDate,
        body.hasAssistance,
        body.assistProgram || body.otherProgramName,
        body.voucherBedrooms,
        body.voucherNumber,
        body.voucherExpDate,
        body.isTransferring,
        body.fromShelter,
        body.landlordName,
        body.landlordPhone,
        body.landlordEmail,
        body.cashAssistActive,
        body.creditScore,
        body.hasOccupants,
        body.occupantCount,
        occupantsDetail,
        body.currentlyWorking,
        body.employerName,
        body.employerAddress,
        body.supervisorName,
        body.supervisorPhone,
        body.payType,
        body.payAmount,
        body.hoursPerWeek,
        body.payFrequency,
        body.isVeteran,
        body.filedTaxes,
        incomeSources,
        body.otherIncomeSource,
        body.housingSpecName,
        body.housingSpecPhone,
        body.housingSpecEmail,
        body.isSmoker,
        body.hasPets,
        `${body.signatureFirst} ${body.signatureLast}`,
        folderLink,
        body.paymentPath,
        body.monthlyIncome,
        body.pathOtherNotes,
        // BD: marketing-opt-in (yes/no). Default to "no" if undefined for
        // back-compat with older client builds in flight.
        (body as { marketingOptIn?: boolean }).marketingOptIn ? "yes" : "no",
      ]);

      await patchFolderProperties(folderId, {
        sheetRowAppended: "1",
        sheetRowNumber: String(rowNumber),
      });
      folderProps.sheetRowAppended = "1";
      folderProps.sheetRowNumber = String(rowNumber);
    }

    // Mirror this submission into the CMS Contacts table. Idempotent via
    // (source_type, source_id) — re-running won't duplicate. Failure is
    // logged and swallowed so it can never break the form submit; the
    // CMS backfill script handles missed rows.
    void upsertTenantContact({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.cellPhone,
      applicationId,
      submittedAt: timestamp,
      marketingOptIn:
        (body as { marketingOptIn?: boolean }).marketingOptIn ?? false,
    });

    if (!folderProps.invoiceCreated) {
      try {
        const { invoiceId } = await createApplicationInvoice({
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          formType: "tenant",
        });
        const rowNumber = parseInt(folderProps.sheetRowNumber ?? "0", 10);
        if (rowNumber > 0) {
          await appendStripeColumnsToRow(
            "Tenant Applications",
            rowNumber,
            invoiceId,
          );
        }
        await patchFolderProperties(folderId, {
          invoiceCreated: "1",
          invoiceId,
        });
      } catch (err) {
        console.error("[stripe-invoice] failed to create invoice:", err);
      }
    }

    if (!folderProps.notificationSent) {
      sendNotificationEmail({
        formType: "tenant",
        applicantName,
        applicantEmail: body.email,
        applicantPhone: body.cellPhone,
        highlights: [
          { label: "Phone", value: body.cellPhone },
          { label: "Email", value: body.email },
          { label: "Borough", value: body.preferredBorough },
          { label: "Path", value: pathLabelFor(body.paymentPath) },
          { label: "Program", value: body.assistProgram || body.otherProgramName || "—" },
          { label: "Voucher Beds", value: body.voucherBedrooms },
          { label: "Monthly Income", value: body.monthlyIncome ? `$${body.monthlyIncome}` : "" },
          { label: "From Shelter", value: body.fromShelter === "yes" ? "Yes" : "No" },
          { label: "Occupants", value: body.hasOccupants === "yes" ? body.occupantCount : "None" },
          { label: "Submitted", value: new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) },
        ],
      })
        .then(() => patchFolderProperties(folderId, { notificationSent: "1" }))
        .catch((err) => console.error("Notification email failed:", err));
    }

    if (!folderProps.submittedAt) {
      await patchFolderProperties(folderId, { submittedAt: timestamp });
    }

    return NextResponse.json({
      success: true,
      folderId,
      folderLink,
      uploadsFolderId,
      occupantFolderIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Tenant submission error:", message);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 },
    );
  }
}
