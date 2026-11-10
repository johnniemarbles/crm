# CRMONIA platform console — initial implementation

Entry point: `/platform`. This is a separate server-rendered operator shell, not a workspace setting.

## Operator access
Set server-side `PLATFORM_OPERATOR_EMAILS=operator@example.com,second@example.com` in the Next.js application deployment. Default is deny-all. All platform routes guard access with `requirePlatformOperator` before reading privileged data; the layout checks independently. Do not use tenant administrator role as a substitute. Do not expose this variable with the NEXT_PUBLIC prefix.

## Implemented
- Isolated operator shell and navigation
- Live global aggregate counts (registered users, agent definitions, runs)
- Integration inventory with truthful workspace-vs-platform status
- Explicit tenant, AI governance, security and configuration readiness views
- Unknown section routes return 404
- Read-only by design: no unguarded privileged mutation endpoints

## Not yet delivered / required to activate platform operations
1. Actual tenant organization, tenant membership, tenancy isolation and provisioning model; current schema is not a multi-tenant platform registry.
2. Persisted platform RBAC, MFA/step-up, revocation and append-only audit log.
3. Platform provider registry and secrets-management integration with per-tenant connections.
4. Strict platform-vs-tenant BYOK enforcement and metering.
5. Tested server-side management APIs and end-to-end verification in deployed environment.

Do not label this first console production-complete or assume that registering an OAuth client enables a tenant integration.
