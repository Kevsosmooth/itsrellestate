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

    const { folderId, folderLink, uploadsFolderId, alreadyExisted } =
      await getOrCreateApplicantFolder(
        landlordFolderId,
        applicantName,
        "landlord",
        idempotencyKey,
      );

    const sanitized = sanitizeForStorage({ ...body, submittedAt: timestamp });
    await saveApplicationJSON(folderId, sanitized);

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

      await appendSheetRow("Landlord Applications", [
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

      await patchFolderProperties(folderId, { sheetRowAppended: "1" });
      folderProps.sheetRowAppended = "1";
    }

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
