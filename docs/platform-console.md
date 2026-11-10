# CRMONIA Platform Control Plane

## Repository implementation
The `/platform` operator shell uses the authenticated Next.js session and an explicit server-only `PLATFORM_OPERATOR_EMAILS` allowlist. It is independent of `/[slug]/settings`. Every server action repeats authorization at the mutation boundary.

## Deploy checklist
1. Run `bun run --filter @crm/db build` or the repository's Prisma generate target after applying the schema update.
2. Apply migration `20261110163000_platform_control_plane` using the normal reviewed migration-deployment process.
3. Set `PLATFORM_OPERATOR_EMAILS` to an explicitly approved comma-separated list of operator account emails.
4. Generate and install a random 32-byte encryption key as 64 hex characters in the **server-only** `PLATFORM_CREDENTIAL_KEY`; store in a managed secret store. Never rotate it without re-encrypting existing records.
5. Build/check the web app, sign in as an allowlisted operator, and verify `/platform` and each subpage. Verify a normal workspace member sees 404 on all platform pages.
6. Verify integration create/update, credential save/rotate/revoke (only redacted last-four), audit events, tenant registration, policy edits and lifecycle restriction in a staging DB.
7. Confirm deployment logs contain no credential values; consider server-action error handling to avoid display of raw input.

## Delivered control-plane functionality
- Separate operator UI and server-side allowlist.
- Tenant registry with `PENDING` / `SUSPENDED` lifecycle controls, policy metadata, and operator audit.
- Integration registry with categories and enable/disable metadata.
- AES-256-GCM encrypted platform credentials with redact/rotate/revoke flows.
- Platform usage ledger schema and display, with idempotent request identifier.
- Operator audit log persisted within the same transactions as configuration mutations.
- AI provider inventory, metering display, operational status.

## Important restrictions
**This is NOT a production multi-tenant runtime.** Existing backend CRM paths use `WORKSPACE_ID` and existing CRM tables generally are not partitioned by tenant. The new tenant registration is control-plane metadata; `ACTIVE` activation and tenant BYOK saving are intentionally rejected. The provider registry is not yet wired to Gmail, Slack, agent execution, payment or telephony adapters, so enabling a provider entry does not activate it. Metering data and policy values are **not** enforced by existing agent execution. Existing OAuth integrations continue to rely on their own runtime environment configuration.

To finish live production multi-tenancy safely: migrate all CRM data to tenant-owned records and enforce tenant scoping at query and job level, provide authenticated tenant runtime context for credential lookup, integrate provider dispatch and metering/budget enforcement, persist platform RBAC with MFA/step-up, build runtime health probes and rollout controls, and run end-to-end cross-tenant isolation and security tests before enabling tenant activation.

## Security design notes
- No decrypted secret is shown to operator screens or serialized to the browser.
- Platform secrets are never automatically used as fallback for tenant-owned work.
- Server-side allowlisting is a bootstrap safeguard, not a complete operational role system.
- All privileged actions perform authorization independently of layout guards.
- Audit metadata contains identifiers and policy values, not credentials.
- Secrets are encrypted with a single versioned key; introduce proper key lifecycle before production rotation.
- Single-workspace CRM records cannot be treated as tenant-owned without explicit migrations.
