# ORB — Project Overview

## What is ORB?

ORB (formerly SCOS HR) is a full-featured, bilingual (EN/AR) HR management platform built for Saudi Arabian companies. It handles the complete employee lifecycle from onboarding through offboarding, with Saudi-specific compliance features (GOSI, WPS, Iqama tracking, Hijri calendar support).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript ^5.4 |
| UI | Tailwind CSS, Lucide icons |
| State | Zustand stores |
| Auth | HMAC-signed JWT tokens (pure-JS, Edge+Node compatible) |
| Persistence | JSON file (`data/db.json`) with atomic rename |
| Deployment | Docker (port 3001), single-container |
| Charts | Recharts |
| i18n | Built-in `t()` helper, RTL support |

## Core Modules

| Module | Description |
|---|---|
| **Dashboard** | Real-time KPIs, charts, notifications, quick actions |
| **Employees** | Full CRUD, org chart, profiles, documents, contracts |
| **Attendance** | Daily tracking, late/absent/half-day, calendar view |
| **Leave Management** | 8 leave types, policy engine, approval workflow, balance tracking |
| **Payroll** | Salary calculation, payslips, GOSI deduction, WPS batch processing |
| **Documents** | Upload, categorize, reminders, expiry tracking |
| **Communication** | Internal messaging, announcements, channels |
| **Expenses** | Submission, approval workflow, category management |
| **Email** | SMTP/Gmail integration, templates, outbox, bulk send |
| **Todos** | Task management with assignees, priorities, due dates |
| **Lifecycle** | Employee events (promotions, transfers, warnings, commendations) |
| **Reports** | Attendance, payroll, leave, employee analytics with export |
| **Settings** | Company profile, work week, holidays, leave policies, branding, modules |
| **Administration** | User management, role assignment, audit logs |

## Authentication & Authorization

- **4 roles**: `admin`, `hr_manager`, `manager`, `employee`
- **Permissions** defined in `lib/rbac.ts` — 30+ granular permissions
- **Token flow**: Login → HMAC-signed token → middleware verifies on every request → route-level `authFromRequest()` + `hasPermission()` checks
- **Module gating**: Each module can be disabled via settings; middleware checks cookie + route map

## Data Model

- 15+ entity types (Employee, Leave, Payroll, Document, etc.)
- All entities have `companyId` for multi-tenancy
- Scrypt-hashed passwords with auto-migration from plaintext
- Gmail OAuth tokens AES-256-GCM encrypted at rest

## Project Structure

```
app/
  (dashboard)/          # Page routes (React Server Components shell)
    employees/          # Employee pages
    payroll/            # Payroll pages
    settings/           # Settings pages
    ...
  api/                  # API routes (21 route groups)
lib/                    # Core libraries (28 files)
  token.ts              # HMAC token signing
  rbac.ts               # Role-based access control
  mock-data.ts          # Central data store (1265 lines)
  persistence.ts        # JSON file persistence
  validation.ts         # Zod schemas
  ...
modules/                # Domain service layers (17 modules)
engines/                # Reusable UI engines (5)
  chart-engine/         # Recharts wrapper
  form-engine/          # Dynamic form builder
  table-engine/         # Data table with sort/filter
  theme-engine/         # Dark/light/auto theme
  notification-engine/  # Toast notifications
components/             # Shared UI components
stores/                 # Zustand state stores
types/                  # TypeScript type definitions
```

## Key Design Decisions

1. **Edge-compatible auth**: Token verification uses pure-JS HMAC (no `node:crypto`), so the same code runs in Next.js middleware (Edge) and API routes (Node)
2. **No external database**: JSON file persistence keeps deployment simple; designed for single-tenant SMB use
3. **Module system**: Features can be toggled on/off per company without code changes
4. **Bilingual first**: Every UI string has EN/AR variants; RTL layout handled via Tailwind `dir` attribute
5. **Saudi compliance**: Built-in GOSI calculations, WPS integration, Iqama tracking, Hijri calendar support

## Running the App

```bash
# Development
npm run dev          # http://localhost:3000

# Production (Docker)
docker compose up -d --build   # http://localhost:3001

# Default credentials
admin@scos.sa / Password123!
employee@scos.sa / Password123!
```
