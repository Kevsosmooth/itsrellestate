import { getSql } from "./applications-neon";
import type { DocSlot } from "./required-docs";

export interface UploadRow {
  id: number;
  application_id: string;
  form_type: string;
  category: string;
  person: string;
  nonce: string;
  drive_file_id: string | null;
  session_uri: string | null;
  quarantine_parent: string | null;
  destination_folder: string | null;
  expected_name: string | null;
  expected_mime: string | null;
  expected_size: number | null;
  status: string;
}

/**
 * PURE: an application is complete only when there IS at least one required
 * slot and every required slot has a matching verified upload.
 * Empty required -> false (never treat a zero-requirement application as
 * billable).
 */
export function requiredSlotsSatisfied(
  requiredSlots: DocSlot[],
  verifiedSlots: { category: string; person: string }[],
): boolean {
  if (requiredSlots.length === 0) return false;
  return requiredSlots.every((r) =>
    verifiedSlots.some((v) => v.category === r.category && v.person === r.person),
  );
}

export async function recordMint(args: {
  applicationId: string;
  formType: "tenant" | "landlord";
  category: string;
  person: string;
  nonce: string;
  driveFileId: string;
  sessionUri: string;
  quarantineParent: string;
  destinationFolder: string;
  expectedName: string;
  expectedMime: string;
  expectedSize: number;
}): Promise<void> {
  const sql = getSql();
  await sql`
    insert into application_uploads (
      application_id, form_type, category, person,
      nonce, drive_file_id, session_uri, quarantine_parent,
      destination_folder, expected_name, expected_mime, expected_size,
      status
    ) values (
      ${args.applicationId}::text,
      ${args.formType}::text,
      ${args.category}::text,
      ${args.person}::text,
      ${args.nonce}::text,
      ${args.driveFileId}::text,
      ${args.sessionUri}::text,
      ${args.quarantineParent}::text,
      ${args.destinationFolder}::text,
      ${args.expectedName}::text,
      ${args.expectedMime}::text,
      ${args.expectedSize}::bigint,
      'minted'
    )
  `;
}

export async function getByNonce(
  applicationId: string,
  nonce: string,
): Promise<UploadRow | null> {
  const sql = getSql();
  const rows = (await sql`
    select
      id,
      application_id,
      form_type,
      category,
      person,
      nonce,
      drive_file_id,
      session_uri,
      quarantine_parent,
      destination_folder,
      expected_name,
      expected_mime,
      expected_size,
      status
    from application_uploads
    where application_id = ${applicationId}::text
      and nonce = ${nonce}::text
    limit 1
  `) as (Omit<UploadRow, "id" | "expected_size"> & {
    id: number | string;
    expected_size: number | string | null;
  })[];

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    id: typeof row.id === "string" ? parseInt(row.id, 10) : row.id,
    expected_size:
      row.expected_size === null
        ? null
        : typeof row.expected_size === "string"
          ? parseInt(row.expected_size, 10)
          : row.expected_size,
  };
}

export async function markStatus(
  nonce: string,
  status: "uploaded" | "verified" | "failed",
): Promise<void> {
  const sql = getSql();
  await sql`
    update application_uploads
       set status = ${status}::text,
           updated_at = now()
     where nonce = ${nonce}::text
  `;
}

export async function listVerifiedSlots(
  applicationId: string,
): Promise<{ category: string; person: string }[]> {
  const sql = getSql();
  const rows = (await sql`
    select distinct category, person
    from application_uploads
    where application_id = ${applicationId}::text
      and status = 'verified'
  `) as { category: string; person: string }[];
  return rows;
}

export async function countForApplication(
  applicationId: string,
): Promise<{ files: number; bytes: number }> {
  const sql = getSql();
  const rows = (await sql`
    select
      count(*)              as files,
      coalesce(sum(expected_size), 0) as bytes
    from application_uploads
    where application_id = ${applicationId}::text
  `) as { files: number | string; bytes: number | string }[];

  const row = rows[0];
  return {
    files:
      typeof row.files === "string" ? parseInt(row.files, 10) : row.files,
    bytes:
      typeof row.bytes === "string" ? parseInt(row.bytes, 10) : row.bytes,
  };
}
