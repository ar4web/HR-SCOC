# ORB — Agent Quick Reference

## CRITICAL: Work Rules

1. **Do NOT run the same command twice.** If `npx tsc --noEmit` passed once, it still passes. Do not re-run to "double-check".
2. **Do NOT read files you already have open.** If you read `lib/rbac.ts` in this conversation, do not read it again.
3. **Do NOT create tests or CI.** There is no test suite. Do not write one. Do not add vitest/jest/playwright. This is explicitly deferred.
4. **Do NOT refactor working code.** If the code compiles and works, leave it alone. Only change what the user asked for.
5. **Do NOT create documentation unless asked.** Only write `.md` files when the user explicitly requests them.
6. **Do NOT run `npm install` or modify `package.json`** unless adding a dependency the user specifically requested.
7. **Make one targeted change, verify it works, then stop.** Do not batch 10 changes and hope they all work.
8. **If a command fails, fix the specific error.** Do not re-run the same command hoping it magically passes.
9. **Read the error message.** If `tsc` says "Type X is not assignable to Y", look at line Y, not at the whole file.
10. **Stop when the task is done.** Do not suggest next steps, do not create follow-up tasks, do not ask "would you also like me to...".

## Verify before committing

```bash
npx tsc --noEmit         # 0 errors — ONLY run once per change
npm run build            # must pass — ONLY run once per change
npx next lint            # 0 errors required (warnings OK) — ONLY run once per change
```

Do NOT run these in a loop. Run once, fix errors if any, run again once. If all pass, commit.

No test suite exists. These three commands are the only verification.

## Dev servers

| Command | Port | Notes |
|---|---|---|
| `npm run dev` | 3000 | Hot-reload dev |
| `npm start` | 3000 | Production build |
| Docker | 3001 | `docker compose up -d --build` |

Multiple servers can run simultaneously — watch for port conflicts (lsof -iTCP -sTCP:LISTEN).

Kill dev servers when done: `kill $(lsof -ti:3001) 2>/dev/null`

## Architecture

- **Next.js 14 App Router** (not Pages Router)
- All API routes use `export const dynamic = 'force-dynamic'` — no static caching
- Path alias: `@/*` → project root (e.g. `import { X } from '@/lib/y'`)
- Client components live in `components/`, pages in `app/(dashboard)/`
- Layouts: `app/(dashboard)/layout.tsx` (shell), `settings/layout.tsx`, `payroll/layout.tsx`

## Auth flow

- Tokens: HMAC-signed (`lib/token.ts`), verified in `middleware.ts` (Edge) and route handlers (Node) using same pure-JS implementation
- **Middleware blocks every `/api/*` except** `['/api/auth/login', '/api/auth/geo', '/api/email/gmail/callback']`
- Route-level auth: `authFromRequest(req)` returns payload or null. Check roles with `hasPermission(role, 'permission')` from `lib/rbac.ts`
- `TOKEN_SECRET` env var required in production; without it, a demo fallback is used (do NOT deploy with fallback)

## Adding auth to a new API route

```typescript
import { authFromRequest, hasPermission } from '@/lib/rbac';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // For admin-only routes:
  if (!hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... handler logic
}
```

## Data persistence

- JSON file: `data/db.json` (with `data/db.backup.json` fallback)
- Loaded once at module init via `lib/persistence.ts` → `lib/mock-data.ts`
- **Do NOT read/write `data/db.json` directly** — always go through `mock-data.ts` exports
- `.gitignore` covers `data/` — do not commit db files

## Passwords

- Stored as scrypt hashes (`lib/passwords.ts`)
- Legacy plaintext auto-migrated on first successful login
- Default password for seeded users: `Password123!`

## Gmail / OAuth tokens

- Refresh tokens encrypted at rest with AES-256-GCM (`lib/crypto-utils.ts`, key = sha256 of TOKEN_SECRET)
- OAuth uses `state` param (10-min TTL, single use) — verified in callback
- Tokens redacted from `GET /api/email` response (never sent to client)

## Zod validation

- Schemas in `lib/validation.ts`: `employeeCreateSchema`, `employeeUpdateSchema`, `companyUpdateSchema`, `messageSchema`, `announcementSchema`, `channelSchema`, `documentCreateSchema`
- All schemas use `.passthrough()` — unknown fields pass through
- Use `parseWith(schema, body)` helper — returns `{ ok, data }` or `{ ok: false, error }`

## Key files

| File | Purpose |
|---|---|
| `lib/token.ts` | Token signing/verification (pure JS, Edge+Node) |
| `lib/rbac.ts` | AuthPayload, decodeToken, encodeToken, hasPermission, authFromRequest |
| `lib/mock-data.ts` | Central data store — all entities, hydration, seed, CRUD |
| `lib/persistence.ts` | JSON file read/write with atomic rename |
| `lib/passwords.ts` | scrypt hash/verify with legacy migration |
| `lib/crypto-utils.ts` | AES-256-GCM encrypt/decrypt (server-only) |
| `lib/validation.ts` | Zod schemas for mutation routes |
| `middleware.ts` | Auth gate + module-disable cookie check |
| `components/layout/PageHeader.tsx` | Responsive page heading (text-xl sm:text-2xl) |
| `Overview.md` | Project overview and module summary |
| `PLAN_ARCHITECTURE.md` | System architecture and data flow |
| `IMPORTER.md` | Excel import guide with template spec |

## Common pitfalls

- `mock-data.ts` is imported by client pages AND server routes — server-only code must use `eval('require')` pattern, never top-level `import fs`
- `lib/passwords.ts`, `lib/crypto-utils.ts` use node:crypto — safe for server only
- All API route handlers must be async and return NextResponse
- ESLint: `@typescript-eslint/parser@7.2.0` + `@typescript-eslint/eslint-plugin@7.2.0` — do NOT upgrade independently
- When testing API routes, use `curl` against `localhost:3001` (dev server on 3001), not by re-building
- Docker rebuild required for production: `docker compose down && docker compose up -d --build`

## Credentials

| Email | Password | Role |
|---|---|---|
| `admin@scos.sa` | `Password123!` | admin |
| `employee@scos.sa` | `Password123!` | employee |

## Deferred (DO NOT work on these)

- Automated test suite (no vitest/jest/playwright)
- CI/CD pipeline
- PostgreSQL migration (P1-6)
- Redis session store
- WebSocket/SSE real-time

## Git rules

- Do NOT commit unless the user explicitly says "commit"
- Do NOT push unless the user explicitly says "push"
- Do NOT amend commits
- Do NOT force push
- Do NOT create branches unless asked
