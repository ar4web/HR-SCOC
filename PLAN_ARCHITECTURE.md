# ORB — Architecture Plan

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                       │
│  React 18 + Zustand stores + Tailwind CSS                │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│               Next.js 14 (App Router)                     │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Middleware (Edge Runtime)                           │ │
│  │  • Token verification (HMAC, pure-JS)               │ │
│  │  • Module-state cookie validation                    │ │
│  │  • Route protection (all /api/* except 3 public)     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  API Routes (Node.js runtime)                        │ │
│  │  21 route groups, 45+ handlers                       │ │
│  │  • authFromRequest() + hasPermission()               │ │
│  │  • Zod validation on mutation endpoints              │ │
│  │  • force-dynamic (no static caching)                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Service Layer (modules/)                            │ │
│  │  17 domain modules                                   │ │
│  │  Business logic + data access                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Data Layer                                          │ │
│  │  lib/mock-data.ts (in-memory Map stores)             │ │
│  │  lib/persistence.ts (atomic JSON file write)         │ │
│  │  data/db.json (persisted state)                      │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Request Flow

```
Browser Request
    │
    ▼
Middleware (Edge)
    ├── Verify HMAC token from cookie/header
    ├── Check module-state cookie vs MODULE_ROUTE_MAP
    ├── Redirect unauthenticated to /login
    └── Forward to API route
         │
         ▼
API Route Handler
    ├── authFromRequest(req) → AuthPayload | null
    ├── hasPermission(role, permission) → boolean
    ├── Parse + validate input (Zod / manual)
    ├── Call service function
    ├── Return NextResponse.json()
    └── persistData() → atomic write to data/db.json
```

## Authentication Architecture

```
Login Flow:
  POST /api/auth/login { email, password }
    → Verify password (scrypt hash)
    → Generate HMAC-signed token (lib/token.ts)
    → Set httpOnly cookie
    → Return { token, user }

Token Structure:
  { sub: userId, role: UserRole, companyId: string }

Verification:
  Pure-JS HMAC-SHA256 (no node:crypto dependency)
  Same code runs in Edge middleware + Node routes
  TOKEN_SECRET env var (demo fallback if unset)
```

## RBAC Permission Matrix

| Permission | Admin | HR Manager | Manager | Employee |
|---|---|---|---|---|
| `employee:manage` | ✅ | ✅ | ❌ | ❌ |
| `employee:view` | ✅ | ✅ | ✅ | ✅ |
| `leave:approve` | ✅ | ✅ | ✅ | ❌ |
| `payroll:manage` | ✅ | ✅ | ❌ | ❌ |
| `settings:manage` | ✅ | ✅ | ❌ | ❌ |
| `user:manage` | ✅ | ❌ | ❌ | ❌ |
| `document:manage` | ✅ | ✅ | ✅ | ❌ |
| `expense:approve` | ✅ | ✅ | ✅ | ❌ |
| `communication:manage` | ✅ | ✅ | ❌ | ❌ |

## Data Persistence Strategy

```
In-Memory (runtime)          On-Disk (persistence)
─────────────────          ─────────────────────
Map<string, Employee>      data/db.json
Map<string, Leave>         (atomic rename)
Map<string, Payroll>
Map<string, Document>
...15+ entity stores

Write path:
  mutate() → persistData() → writeAtomic(filePath, JSON.stringify(data))
  Atomic: write to temp file → rename to target (no corruption on crash)

Read path:
  Startup: readDb() → parse JSON → populate Maps
  Runtime: direct Map reads (fast)
```

## Module System

```
Module Definition:
  { id, name, nameAr, icon, dependencies[], route }

Module States (per-company):
  { dashboard: true, employees: true, payroll: false, ... }

Middleware Check:
  1. Read MODULE_STATES_COOKIE from request
  2. Match request path against MODULE_ROUTE_MAP
  3. If module disabled → redirect to /
  4. If no cookie → fetch from API, set cookie
```

## File Structure Deep Dive

```
lib/                    # Core libraries (28 files)
  token.ts              # HMAC token sign/verify
  rbac.ts               # Permissions + role checks
  mock-data.ts          # Central data store (1265 lines)
  persistence.ts        # Atomic JSON write
  passwords.ts          # Scrypt hash/verify
  crypto-utils.ts       # AES-256-GCM encrypt/decrypt
  validation.ts         # Zod schemas
  admin-engine.ts       # User management
  attendance-engine.ts  # Attendance logic
  payroll-engine.ts     # Salary/GOSI/WPS
  email-engine.ts       # Template + outbox system
  leave-policy-engine.ts # Leave balance/validation
  document-engine.ts    # Document management
  dashboard-engine.ts   # KPI aggregation
  lifecycle-engine.ts   # Employee events
  expense-engine.ts     # Expense tracking
  todo-engine.ts        # Task management
  reminders-engine.ts   # Reminder scheduling
  timesheet.ts          # Timesheet generation
  csv.ts                # CSV export
  excel.ts              # Excel import parsing
  gmail-provider.ts     # Gmail OAuth flow
  smtp-provider.ts      # SMTP email sending
  api.ts                # Client-side API wrapper
  utils.ts              # Date/currency/formatting
  module-route-map.ts   # Module→route mapping

modules/                # Domain services (17)
  employee-management/  # Employee CRUD service
  leave-management/     # Leave request service
  payroll/              # Payroll processing
  email/                # Email service
  attendance/           # Attendance service
  communication/        # Messaging service
  document-management/  # Document service
  expense-management/   # Expense service
  lifecycle/            # Employee lifecycle
  todo-management/      # Task service
  dashboard/            # Dashboard data
  reports/              # Report generation
  settings/             # Settings management
  administration/       # Admin operations
  auth/                 # Authentication
  company/              # Company data
  me/                   # Profile management
```

## Security Layers

1. **Middleware**: Token verification on every `/api/*` request
2. **Route handlers**: `authFromRequest()` + `hasPermission()` checks
3. **Password storage**: Scrypt hashing with auto-migration
4. **Token secrets**: HMAC-signed, `TOKEN_SECRET` env var
5. **OAuth state**: CSRF protection on Gmail callback
6. **Input validation**: Zod schemas on mutation routes
7. **File upload**: MIME type check + 10MB cap
8. **Encryption**: AES-256-GCM for Gmail tokens at rest
9. **Module gating**: Cookie-based module state validation
10. **Audit logging**: User actions tracked in admin engine

## Scaling Considerations

| Concern | Current | Future |
|---|---|---|
| Database | JSON file | PostgreSQL (P1-6 deferred) |
| Auth sessions | In-memory token | Redis session store |
| File storage | Local filesystem | S3-compatible object store |
| Email | SMTP/Gmail direct | Queue-based async sending |
| Real-time | Polling (60s) | WebSocket/SSE |
| Multi-tenant | Single company | Company isolation via DB schema |
| Tests | Manual sweep | Vitest + Playwright |
