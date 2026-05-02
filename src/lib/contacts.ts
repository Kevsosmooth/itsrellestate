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
 * Errors are caught and logged: the contacts upsert must never block a
 * successful sheet write. The CMS backfill script can re-run to catch
 * anything that fails here.
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

  try {
    const sql = getSql();

    // Make sure the parent applications row exists so contact_submissions
    // can foreign-key to it. Status defaults to "unpaid" until the CMS or
    // Stripe webhook flips it.
    await sql`
      insert into applications (
        id, workspace_id, applicant_type, submitted_at, status
      ) values (
        ${input.applicationId}::text, ${WORKSPACE_ID}::uuid, 'tenant',
        ${input.submittedAt}::timestamptz, 'unpaid'
      )
      on conflict (id) do nothing
    `;

    // Upsert contact.
    const upsert = (await sql`
      insert into contacts (
        workspace_id, email, email_lower, name, phone,
        name_updated_at, phone_updated_at,
        marketing_opt_in, opt_in_source, opted_in_at
      ) values (
        ${WORKSPACE_ID}::uuid, ${email}::text, ${emailLower}::text,
        ${name}::text, ${phone}::text,
        case when ${name}::text is not null then now() else null end,
        case when ${phone}::text is not null then now() else null end,
        ${input.marketingOptIn}::boolean,
        ${input.marketingOptIn ? "tenant_application" : null}::text,
        case when ${input.marketingOptIn}::boolean then now() else null end
      )
      on conflict (workspace_id, email_lower) do update
        set
          name = case
            when contacts.manual_name_locked then contacts.name
            when excluded.name is not null and excluded.name <> coalesce(contacts.name, '') then excluded.name
            else contacts.name
          end,
          phone = case
            when contacts.manual_phone_locked then contacts.phone
            when excluded.phone is not null and excluded.phone <> coalesce(contacts.phone, '') then excluded.phone
            else contacts.phone
          end,
          marketing_opt_in = excluded.marketing_opt_in or contacts.marketing_opt_in,
          opt_in_source = case
            when excluded.marketing_opt_in then coalesce(contacts.opt_in_source, excluded.opt_in_source)
            else contacts.opt_in_source
          end,
          opted_in_at = case
            when excluded.marketing_opt_in then coalesce(contacts.opted_in_at, excluded.opted_in_at)
            else contacts.opted_in_at
          end
      returning id
    `) as Array<{ id: string }>;
    const contactId = upsert[0].id;

    // Tags: tenant always; marketing-opted-in iff consented.
    await sql`
      insert into contact_tags (contact_id, tag_key)
      values (${contactId}::uuid, 'tenant')
      on conflict (contact_id, tag_key) do nothing
    `;
    if (input.marketingOptIn) {
      await sql`
        insert into contact_tags (contact_id, tag_key)
        values (${contactId}::uuid, 'marketing-opted-in')
        on conflict (contact_id, tag_key) do nothing
      `;
    }

    // Submission link.
    await sql`
      insert into contact_submissions (
        contact_id, source_type, source_id, application_id,
        submitted_at, payload
      ) values (
        ${contactId}::uuid, 'tenant_application',
        ${input.applicationId}::text, ${input.applicationId}::text,
        ${input.submittedAt}::timestamptz,
        ${JSON.stringify({
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email,
          submittedAt: input.submittedAt,
          marketingOptIn: input.marketingOptIn,
        })}::jsonb
      )
      on conflict (source_type, source_id) do update
        set contact_id = excluded.contact_id,
            application_id = excluded.application_id,
            submitted_at = excluded.submitted_at,
            payload = excluded.payload
    `;

    // Audit row — system actor since this is the public submit pipeline.
    await sql`
      insert into audit_log (
        workspace_id, actor_type, actor_label, action,
        entity_type, entity_id, parent_entity_type, parent_entity_id,
        metadata
      ) values (
        ${WORKSPACE_ID}::uuid, 'public', 'tenant-application-submit',
        'contact.upsert.from_tenant_submission',
        'contact', ${contactId}::uuid,
        'application', ${input.applicationId}::text,
        ${JSON.stringify({
          email: emailLower,
          marketingOptIn: input.marketingOptIn,
        })}::jsonb
      )
    `;
  } catch (err) {
    // Never block the form submit. The CMS backfill script can be re-run.
    console.error("[contacts] upsertTenantContact failed:", err);
  }
}
