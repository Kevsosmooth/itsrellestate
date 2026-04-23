import { NextResponse } from "next/server";
import {
  createApplicantFolder,
  saveApplicationJSON,
  appendSheetRow,
} from "@/lib/google";
import { landlordSchema, maskSensitiveField, sanitizeForStorage } from "@/lib/validation";

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

    const { folderId, folderLink, uploadsFolderId } = await createApplicantFolder(
      landlordFolderId,
      applicantName,
      "landlord",
    );

    const sanitized = sanitizeForStorage({ ...body, submittedAt: timestamp });
    await saveApplicationJSON(folderId, sanitized);

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
      maskSensitiveField(body.taxId),
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

    return NextResponse.json({
      success: true,
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
