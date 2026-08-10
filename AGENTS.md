# ORB — Agent Quick Reference

## Verify before committing

```bash
npx next lint            # 0 errors required (warnings OK)
npx tsc --noEmit         # 0 errors
npm run build            # must pass (39 static pages)
```

No test suite exists. These three commands are the only verification.

## Dev servers

| Command | Port | Notes |
|---|---|---|
| `npm run dev` | 3000 | Hot-reload dev |
| `npm start` | 3000 | Production build |
| Docker | 3001 | `docker compose up -d --build` |

Multiple servers can run simultaneously — watch for port conflicts (lsof -iTCP -sTCP:LISTEN).

## Architecture

- **Next.js 14 App Router** (not Pages Router)
- All API routes use `export const dynamic = 'force-dynamic'` — no static caching
- Path alias: `@/*` → project root (e.g. `import { X } from '@/lib/y'`)
- Client components live in `components/`, pages in `app/(dashboard)/`
- Layouts: `app/(dashboard)/layout.tsx` (shell), `settings/layout.tsx`, `payroll/layout.tsx` — each renders its own `<h1>` and sidebar nav

## Auth flow

- Tokens: HMAC-signed (`lib/token.ts`), verified in `middleware.ts` (Edge) and route handlers (Node) using same pure-JS implementation
- **Middleware blocks every `/api/*` except** `['/api/auth/login', '/api/auth/geo', '/api/email/gmail/callback']`
- Route-level auth: `authFromRequest(req)` returns payload or null. Check roles with `hasPermission(role, 'permission')` from `lib/rbac.ts`
- `TOKEN_SECRET` env var required in production; without it, a demo fallback is used (do NOT deploy with fallback)

## Data persistence

- JSON file: `data/db.json` (with `data/db.backup.json` fallback)
- Loaded once at module init via `lib/persistence.ts` → `lib/mock-data.ts`
- **Do NOT read/write `data/db.json` directly** — always go through `mock-data.ts` exports
- `.gitignore` covers `data/` — do not commit db files

## Passwords

- Stored as scrypt hashes (`lib/passwords.ts`)
- Legacy plaintext auto-migrated on first successful login (verify → rehash → persist)
- Seed data uses plaintext in source; hashed at hydration on server

## Gmail / OAuth tokens

- Refresh tokens encrypted at rest with AES-256-GCM (`lib/crypto-utils.ts`, key = sha256 of TOKEN_SECRET)
- OAuth uses `state` param (10-min TTL, single use) — verified in callback
- Tokens redacted from `GET /api/email` response (never sent to client)

## Zod validation

- Schemas in `lib/validation.ts`: `employeeCreateSchema`, `employeeUpdateSchema`, `companyUpdateSchema`, `messageSchema`, `announcementSchema`, `channelSchema`, `documentCreateSchema`
- All schemas use `.passthrough()` — unknown fields pass through (client sends extra fields for some forms)
- Use `parseWith(schema, body)` helper — returns `{ ok, data }` or `{ ok: false, error }`
- Route handlers cast validated data to engine params: `parsed.data as Parameters<typeof createEmployee>[0]`

## Key files to read first

| File | Purpose |
|---|---|
| `lib/token.ts` | Token signing/verification (pure JS, Edge+Node) |
| `lib/rbac.ts` | AuthPayload type, decodeToken, encodeToken, hasPermission, authFromRequest |
| `lib/mock-data.ts` | Central data store — all entities, hydration, seed, CRUD |
| `lib/persistence.ts` | JSON file read/write with atomic rename |
| `lib/passwords.ts` | scrypt hash/verify with legacy migration |
| `lib/crypto-utils.ts` | AES-256-GCM encrypt/decrypt (server-only) |
| `lib/validation.ts` | Zod schemas for mutation routes |
| `middleware.ts` | Auth gate + module-disable cookie check |
| `components/layout/PageHeader.tsx` | Responsive page heading (text-xl sm:text-2xl) |

## Common pitfalls

- `mock-data.ts` is imported by client pages AND server routes — server-only code must use `eval('require')` pattern (see `serverRequire`), never top-level `import fs`
- `lib/passwords.ts`, `lib/crypto-utils.ts` use node:crypto — safe for server only; they guard with runtime checks
- `updateEmailSettings()` mutates the live object — shallow-clone before deleting sensitive fields (see `app/api/email/route.ts`)
- All API route handlers must be async and return NextResponse
- ESLint config: `.eslintrc.json` with `next/core-web-vitals` + `@typescript-eslint/parser` (pinned to v7.2.0 — do not upgrade parser/plugin independently)
- `AGENT_FAST_REVIEW_PLAYBOOK.md` — Codex's operating playbook; read it for context on what's deferred vs. in-scope
