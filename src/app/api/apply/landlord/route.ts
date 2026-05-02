import { NextResponse } from "next/server";
import {
  getOrCreateApplicantFolder,
  saveApplicationJSON,
  appendSheetRow,
  sendNotificationEmail,
  patchFolderProperties,
  getFolderProperties,
} from "@/lib/google";
import { landlordSchema, sanitizeForStorage } from "@/lib/validation";
import { upsertLandlordApplicationPayload } from "@/lib/applications-neon";

export const runtime = "nodejs";

const IDEMPOTENCY_KEY_RE = /^[a-zA-Z0-9_-]{8,128}$/;

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
    const parsed = landlordSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const landlordFolderId = process.env.GOOGLE_LANDLORD_FOLDER_ID;
    if (!landlordFolderId) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const applicantName = `${body.llFirstName} ${body.llLastName}`.trim();
    const timestamp = new Date().toISOString();

    const { folderId, folderLink, folderName, uploadsFolderId, alreadyExisted } =
      await getOrCreateApplicantFolder(
        landlordFolderId,
        applicantName,
        "landlord",
        idempotencyKey,
      );

    // Stable application id matches the encoding the CMS uses to derive
    // ids from Drive folder names. Used for the Neon mirror below.
    const applicationId = encodeURIComponent(
      folderName.replace(/\s+/g, "_"),
    );

    const dataForStorage = { ...body, submittedAt: timestamp };
    const sanitized = sanitizeForStorage(dataForStorage);
    await saveApplicationJSON(folderId, sanitized);
    // Use the same sanitized payload that's written to Drive for the
    // Neon mirror so the two representations don't drift. Codex round-1
    // Finding #2 (2026-05-02) — sanitizeForStorage strips bank account
    // detail; Neon must store the same redacted shape Drive does.
    const sanitizedPayload = sanitized as Record<string, unknown>;

    const folderProps = alreadyExisted ? await getFolderProperties(folderId) : {};

    if (!folderProps.sheetRowAppended) {
      const legalNameDisplay = body.ownershipType === "individual"
        ? body.legalName
        : body.legalBusinessName;

      const unitsDetail = body.units
        .map((u) => `Unit ${u.unitNumber}: Floor ${u.floor}, ${u.bedrooms}BR, $${u.rent}/mo`)
        .join("; ");

      const authRepName = body.hasAuthRep === "yes"
        ? `${body.authRepFirst} ${body.authRepLast}`
        : "";

      const bankDisplay = body.bankName === "other" ? body.bankNameOther : body.bankName;

      const mailAddress = `${body.mailAddress}${body.mailAddress2 ? ` ${body.mailAddress2}` : ""}`;

      const { rowNumber } = await appendSheetRow("Landlord Applications", [
        timestamp,
        `${body.propAddress}${body.propAddress2 ? ` ${body.propAddress2}` : ""}`,
        body.propCity,
        body.propState,
        body.propZip,
        body.ownershipType,
        legalNameDisplay,
        body.taxId,
        body.paymentPreference,
        bankDisplay,
        body.accountType,
        mailAddress,
        body.mailCity,
        body.mailState,
        body.mailZip,
        body.llFirstName,
        body.llLastName,
        body.llPhone,
        body.llEmail,
        body.hasAuthRep,
        authRepName,
        body.hasAuthRep === "yes" ? body.authRepPhone : "",
        body.hasAuthRep === "yes" ? body.authRepEmail : "",
        body.yearBuilt,
        body.totalStories,
        body.residentialUnits,
        body.commercialUnits,
        body.rentStabilized,
        body.utilHeating,
        body.utilCooking,
        body.utilHotWater,
        body.utilElectric,
        body.utilWater,
        body.utilSewer,
        body.utilTrash,
        body.utilAC,
        unitsDetail,
        body.payCheck ? "Yes" : "No",
        body.payZelle ? "Yes" : "No",
        body.payACH ? "Yes" : "No",
        `${body.pocFirstName} ${body.pocLastName}`,
        body.pocPhone,
        body.pocEmail,
        body.submitterTitle,
        `${body.signatureFirst} ${body.signatureLast}`,
        folderLink,
      ]);

      await patchFolderProperties(folderId, {
        sheetRowAppended: "1",
        sheetRowNumber: String(rowNumber),
      });
      folderProps.sheetRowAppended = "1";
      folderProps.sheetRowNumber = String(rowNumber);
    }

    // Mirror the full submission body into Neon application_payloads.
    // Awaited (matching the tenant route + contacts.ts pattern) so the
    // request lifecycle doesn't kill the write mid-flight. The helper is
    // internally transactional and swallows its own errors, so it can
    // never block the Sheets+Drive primary path during the dual-write
    // soak window.
    const sheetRowNumber = folderProps.sheetRowNumber
      ? parseInt(folderProps.sheetRowNumber, 10) || null
      : null;
    await upsertLandlordApplicationPayload({
      applicationId,
      folderId,
      folderLink,
      submittedAt: timestamp,
      sheetRowNumber,
      email: body.llEmail,
      payload: sanitizedPayload,
    });

    if (!folderProps.notificationSent) {
      const propAddress = `${body.propAddress}${body.propAddress2 ? ` ${body.propAddress2}` : ""}, ${body.propCity}`;
      const unitsSummary = body.units.map((u) => `Unit ${u.unitNumber} (${u.bedrooms}BR)`).join(", ");

      sendNotificationEmail({
        formType: "landlord",
        applicantName,
        applicantEmail: body.llEmail,
        applicantPhone: body.llPhone,
        highlights: [
          { label: "Phone", value: body.llPhone },
          { label: "Email", value: body.llEmail },
          { label: "Property", value: propAddress },
          { label: "Units", value: unitsSummary },
          { label: "Ownership", value: body.ownershipType === "individual" ? "Individual" : "Business Entity" },
          { label: "Payment Pref", value: body.paymentPreference },
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Landlord submission error:", message);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 },
    );
  }
}
