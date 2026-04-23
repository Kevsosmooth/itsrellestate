import { NextResponse } from "next/server";
import {
  createApplicantFolder,
  saveApplicationJSON,
  appendSheetRow,
  sendNotificationEmail,
} from "@/lib/google";
import { tenantSchema, sanitizeForStorage } from "@/lib/validation";

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

    const { folderId, folderLink, uploadsFolderId, occupantFolderIds } =
      await createApplicantFolder(
        tenantFolderId,
        applicantName,
        "tenant",
        over18Names,
      );

    const dataForStorage = { ...body, submittedAt: timestamp };
    delete (dataForStorage as Record<string, unknown>).paymentConfirmed;
    const sanitized = sanitizeForStorage(dataForStorage);
    await saveApplicationJSON(folderId, sanitized);

    const occupantsDetail = body.occupants
      .map((o) => `${o.name} (${o.relationship}, ${o.over18 === "yes" ? "18+" : "under 18"})`)
      .join("; ");

    const incomeSources = Array.isArray(body.incomeSources)
      ? body.incomeSources.join(", ")
      : "";

    await appendSheetRow("Tenant Applications", [
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
    ]);

    await sendNotificationEmail({
      formType: "tenant",
      applicantName,
      applicantEmail: body.email,
      applicantPhone: body.cellPhone,
      highlights: [
        { label: "Phone", value: body.cellPhone },
        { label: "Email", value: body.email },
        { label: "Borough", value: body.preferredBorough },
        { label: "Program", value: body.assistProgram || body.otherProgramName || "None" },
        { label: "Voucher Beds", value: body.voucherBedrooms },
        { label: "From Shelter", value: body.fromShelter === "yes" ? "Yes" : "No" },
        { label: "Occupants", value: body.hasOccupants === "yes" ? body.occupantCount : "None" },
        { label: "Submitted", value: new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) },
      ],
    }).catch((err) => console.error("Notification email failed:", err));

    return NextResponse.json({
      success: true,
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
