/**
 * Public-site → CMS contacts upsert.
 *
 * Per Codex+Claude binding vote (2026-05-02): every public-site
 * submission becomes (or merges into) a contact in Postgres so the agent
 * has a unified record without waiting on the next CMS backfill run.
 *
 * This module is intentionally tiny — one helper, no Kysely. Using the
 * @neondatabase/serverless HTTP driver directly keeps the public site's
 * cold-start light and avoids needing the full CMS dependency tree.
 */

import { neon } from "@neondatabase/serverless";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Opaque key that records which disclosure text version the applicant
 * saw at consent time. Bump this value when the privacy/terms language
 * or the checkbox copy changes materially. Stored on contacts.disclosure_version
 * so we have audit trail evidence per consent.
 */
const DISCLOSURE_VERSION = "2026-05-02";

let cachedSql: ReturnType<typeof neon> | null = null;
function getSql() {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  cachedSql = neon(url);
  return cachedSql;
}

export type TenantContactSnapshot = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  applicationId: string;
  submittedAt: string;
  marketingOptIn: boolean;
};

/**
 * Upsert a contact row keyed on lower(email), tag "tenant", attach the
 * submission. Idempotent — the conflict handler does the right thing on
 * re-application from the same email.
 *
 * Marketing opt-in is structured: stored on `contacts.marketing_opt_in`
 * AND mirrored as a `marketing-opted-in` tag for tag-based queries.
 *
 * Per Codex round-1 Findings 7 + 13 (2026-05-02): every statement runs
 * inside ONE transaction so partial writes can't leave the DB
 * inconsistent. The conflict handler also maintains `name_prev` /
 * `phone_prev` and bumps `*_updated_at` so this path matches the
 * CMS-side upsert contract.
 *
 * Errors are caught and logged: the contacts upsert must never block a
 * successful sheet write. The CMS backfill script is the safety net.
 */
export async function upsertTenantContact(
  input: TenantContactSnapshot,
): Promise<void> {
  const email = input.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const emailLower = email.toLowerCase();
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const name = fullName.length > 0 ? fullName : null;
  const phone = input.phone.trim() || null;

  const submissionPayload = JSON.stringify({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email,
    submittedAt: input.submittedAt,
    marketingOptIn: input.marketingOptIn,
  });

  try {
    const sql = getSql();

    // Single transaction across all writes. The Neon HTTP driver supports
    // sql.transaction([...]) which sends every statement in one POST and
    // commits/aborts together.
    await sql.transaction([
      sql`
        insert into applications (
          id, workspace_id, applicant_type, submitted_at, status
        ) values (
          ${input.applicationId}::text, ${WORKSPACE_ID}::uuid, 'tenant',
          ${input.submittedAt}::timestamptz, 'unpaid'
        )
        on conflict (id) do nothing
      `,
      sql`
        insert into contacts (
          workspace_id, email, email_lower, name, phone,
          name_updated_at, phone_updated_at,
          marketing_opt_in, opt_in_source, opted_in_at, disclosure_version
        ) values (
          ${WORKSPACE_ID}::uuid, ${email}::text, ${emailLower}::text,
          ${name}::text, ${phone}::text,
          case when ${name}::text is not null then now() else null end,
          case when ${phone}::text is not null then now() else null end,
          ${input.marketingOptIn}::boolean,
          ${input.marketingOptIn ? "tenant_application" : null}::text,
          case when ${input.marketingOptIn}::boolean then now() else null end,
          ${input.marketingOptIn ? DISCLOSURE_VERSION : null}::text
        )
        on conflict (workspace_id, email_lower) do update
          set
            name = case
              when contacts.manual_name_locked then contacts.name
              when excluded.name is not null and excluded.name <> coalesce(contacts.name, '') then excluded.name
              else contacts.name
            end,
            name_updated_at = case
              when contacts.manual_name_locked then contacts.name_updated_at
              when excluded.name is not null and excluded.name <> coalesce(contacts.name, '') then now()
              else contacts.name_updated_at
            end,
            name_prev = case
              when not contacts.manual_name_locked
                and excluded.name is not null
                and excluded.name <> coalesce(contacts.name, '')
                and contacts.name is not null
              then jsonb_build_array(
                jsonb_build_object('value', contacts.name, 'replacedAt', now())
              ) || coalesce(contacts.name_prev, '[]'::jsonb)
              else contacts.name_prev
            end,
            phone = case
              when contacts.manual_phone_locked then contacts.phone
              when excluded.phone is not null and excluded.phone <> coalesce(contacts.phone, '') then excluded.phone
              else contacts.phone
            end,
            phone_updated_at = case
              when contacts.manual_phone_locked then contacts.phone_updated_at
              when excluded.phone is not null and excluded.phone <> coalesce(contacts.phone, '') then now()
              else contacts.phone_updated_at
            end,
            phone_prev = case
              when not contacts.manual_phone_locked
                and excluded.phone is not null
                and excluded.phone <> coalesce(contacts.phone, '')
                and contacts.phone is not null
              then jsonb_build_array(
                jsonb_build_object('value', contacts.phone, 'replacedAt', now())
              ) || coalesce(contacts.phone_prev, '[]'::jsonb)
              else contacts.phone_prev
            end,
            marketing_opt_in = excluded.marketing_opt_in or contacts.marketing_opt_in,
            opt_in_source = case
              when excluded.marketing_opt_in then coalesce(contacts.opt_in_source, excluded.opt_in_source)
              else contacts.opt_in_source
            end,
            opted_in_at = case
              when excluded.marketing_opt_in then coalesce(contacts.opted_in_at, excluded.opted_in_at)
              else contacts.opted_in_at
            end,
            -- Per Codex round-2 Finding 1 (2026-05-02): when an EXISTING
            -- contact opts in for the first time (or re-opts after a
            -- stale opt_out), record the disclosure version they saw.
            -- We never overwrite a previously-recorded version because
            -- the original disclosure is the legally meaningful artifact.
            disclosure_version = case
              when excluded.marketing_opt_in
                and contacts.disclosure_version is null
              then excluded.disclosure_version
              else contacts.disclosure_version
            end
      `,
      sql`
        insert into contact_tags (contact_id, tag_key)
        select c.id, 'tenant'
          from contacts c
         where c.workspace_id = ${WORKSPACE_ID}::uuid
           and c.email_lower = ${emailLower}::text
        on conflict (contact_id, tag_key) do nothing
      `,
      sql`
        insert into contact_tags (contact_id, tag_key)
        select c.id, 'marketing-opted-in'
          from contacts c
         where c.workspace_id = ${WORKSPACE_ID}::uuid
           and c.email_lower = ${emailLower}::text
           and ${input.marketingOptIn}::boolean = true
        on conflict (contact_id, tag_key) do nothing
      `,
      sql`
        insert into contact_submissions (
          contact_id, source_type, source_id, application_id,
          submitted_at, payload
        )
        select c.id, 'tenant_application',
               ${input.applicationId}::text, ${input.applicationId}::text,
               ${input.submittedAt}::timestamptz,
               ${submissionPayload}::jsonb
          from contacts c
         where c.workspace_id = ${WORKSPACE_ID}::uuid
           and c.email_lower = ${emailLower}::text
        on conflict (source_type, source_id) do update
          set contact_id = excluded.contact_id,
              application_id = excluded.application_id,
              submitted_at = excluded.submitted_at,
              payload = excluded.payload
      `,
      sql`
        insert into audit_log (
          workspace_id, actor_type, actor_label, action,
          entity_type, entity_id, parent_entity_type, parent_entity_id,
          metadata
        )
        select ${WORKSPACE_ID}::uuid, 'public', 'tenant-application-submit',
               'contact.upsert.from_tenant_submission',
               'contact', c.id::text, 'application', ${input.applicationId}::text,
               ${JSON.stringify({
                 email: emailLower,
                 marketingOptIn: input.marketingOptIn,
                 disclosureVersion: DISCLOSURE_VERSION,
               })}::jsonb
          from contacts c
         where c.workspace_id = ${WORKSPACE_ID}::uuid
           and c.email_lower = ${emailLower}::text
      `,
      // Per Codex round-2 Finding 5: cap *_prev arrays at 5 most-recent
      // entries to match the CMS-path contract. Identical SQL trim
      // expression to the one in cms/core/data/contacts-db.ts so behavior
      // never drifts between mirror writes.
      sql`
        update contacts c
           set name_prev = (
             select coalesce(jsonb_agg(elem), '[]'::jsonb)
               from (
                 select elem
                   from jsonb_array_elements(coalesce(c.name_prev, '[]'::jsonb))
                        with ordinality e(elem, ord)
                  order by ord
                  limit 5
               ) trimmed
           ),
               phone_prev = (
             select coalesce(jsonb_agg(elem), '[]'::jsonb)
               from (
                 select elem
                   from jsonb_array_elements(coalesce(c.phone_prev, '[]'::jsonb))
                        with ordinality e(elem, ord)
                  order by ord
                  limit 5
               ) trimmed
           )
         where c.workspace_id = ${WORKSPACE_ID}::uuid
           and c.email_lower = ${emailLower}::text
      `,
    ]);
  } catch (err) {
    // Never block the form submit. The CMS backfill script can be re-run.
    console.error("[contacts] upsertTenantContact failed:", err);
  }
}
