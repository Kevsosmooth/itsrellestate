import { getSql } from "../src/lib/applications-neon";

async function main() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS application_uploads (
      id                 bigserial PRIMARY KEY,
      application_id     text NOT NULL,
      form_type          text NOT NULL,
      category           text NOT NULL,
      person             text NOT NULL,
      nonce              text NOT NULL UNIQUE,
      drive_file_id      text,
      session_uri        text,
      quarantine_parent  text,
      destination_folder text,
      expected_name      text,
      expected_mime      text,
      expected_size      bigint,
      status             text NOT NULL DEFAULT 'minted',
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_app_uploads_app ON application_uploads(application_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_app_uploads_app_status ON application_uploads(application_id, status)`;
  await sql`
    CREATE TABLE IF NOT EXISTS application_invoice_locks (
      application_id text PRIMARY KEY,
      created_at     timestamptz NOT NULL DEFAULT now()
    )`;
  console.log("migration ok: application_uploads + application_invoice_locks");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
