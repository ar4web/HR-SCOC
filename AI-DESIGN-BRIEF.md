# ORB HR App — Complete UI/UX Specification for AI Design Agent

> **Purpose**: This document gives a design-focused AI agent full knowledge of the app's current UI so it can produce pro-level redesign plans (layout, spacing, hierarchy, style, icons, placement). A developer agent will implement from your output.
>
> **Golden rule**: You may change *how things look and are arranged*. Do NOT change *what data is shown or saved*, API contracts, or business logic unless explicitly marked as an approved enhancement.

---

## 1. PROJECT OVERVIEW

| Item | Value |
|---|---|
| Product | Enterprise HR system ("SCOS Platform" / Saudi Corporate Operating System) |
| Stack | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Zustand |
| Users | Roles: `admin` > `hr_manager` > `manager` > `employee` (permission-gated UI) |
| Languages | Bilingual English + Arabic. Full **RTL support** — every screen must mirror correctly |
| Deployment | Docker compose at http://localhost:3001 |

### File map (where UI lives)
```
app/(dashboard)/<route>/page.tsx     → route shells (most dynamic-import a Content component)
components/<module>/                 → per-module content components
components/layout/                   → Sidebar.tsx, Header.tsx, PageHeader.tsx, GlobalSearch.tsx,
                                       NotificationsDropdown.tsx
components/ui/                       → shared primitives (Button, Card, Badge, Input, Toast, …)
components/module-settings/          → ModuleSettingsMenu (gear dropdown on every module page)
engines/table-engine/                → DataTable (sortable columns + MultiSelect filters)
engines/chart-engine/                → Chart wrapper (recharts-style, RTL/locale aware)
lib/chart-theme.ts                   → useChartTheme() + statusHexMap() — ALL chart colors
lib/navigation.ts                    → NAV_LINKS (sidebar source of truth)
lib/utils.ts                         → t(en,ar,lang) translator, getStatusColor, formatters
styles/globals.css                   → tokens, warm-neutral overrides, square-corner rule
tailwind.config.js                   → theme token wiring, shadows, animations, rtl/ltr variants
stores/language-store.ts             → { language: 'en'|'ar', dir } — sets <html dir>
```

---

## 1.5 COMPLETE FOLDER MAP (every path an agent may need)

### Root files
| Path | What it is |
|---|---|
| `package.json` | Scripts: `dev` / `build` / `start` / `lint`. Deps: Next 14, Radix UI primitives, apexcharts, lucide-react, zustand, react-hook-form + zod |
| `tailwind.config.js` | Theme token wiring (CSS-var colors), shadows, animations, `rtl:`/`ltr:` variant plugin |
| `styles/globals.css` | Font imports (Inter/Cairo), CSS vars (`--color-*`, `--radius-*`), `.card` classes, warm-neutral overrides, square-corner rule |
| `middleware.ts` | Edge middleware: auth gate (public paths = `/login` only), disabled-module route blocking via cookie, token from cookie or Bearer header |
| `docker-compose.yml` | Service `hr-app` → port **3001**:3000, mounts `./data:/app/data` (persistence) |
| `Dockerfile` / `docker-entrypoint.sh` | Production build + entrypoint |
| `next.config.js` / `postcss.config.js` / `tsconfig.json` | Standard config |
| `AGENTS.md` | Dev rules for coding agents (verify commands, one-change-at-a-time) |
| `AI-DESIGN-BRIEF.md` | This file |

### `app/` — routes & API
```
app/layout.tsx                    root layout (html lang/dir, Providers, PWA manifest)
app/(dashboard)/                  ALL page shells (each dynamic-imports its Content component, ssr:false)
  page.tsx                        Dashboard
  login/page.tsx                  Login (public)
  employees/page.tsx · employees/new/page.tsx · employees/[id]/page.tsx
  attendance/page.tsx
  leaves/page.tsx · leaves/new/page.tsx · leaves/[id]/page.tsx
  payroll/page.tsx + payroll/layout.tsx (sub-nav)
    payroll/employees/ · payroll/gosi/ · payroll/wps/ · payroll/payslips/
  documents/page.tsx  contracts/page.tsx  lifecycle/page.tsx
  todos/page.tsx  reminders/page.tsx  expenses/page.tsx
  reports/page.tsx  organization/page.tsx  administration/page.tsx
  communication/page.tsx  email/page.tsx  notifications/page.tsx  me/page.tsx
  settings/layout.tsx (left-rail nav) +
    settings/company/ · branding/ · modules/ · work-week/ · holidays/
    settings/leave-policies/ · profile/ · billing/ · support/
app/api/<resource>/route.ts       ~48 REST route handlers (see workflow §1.6)
```

### `components/` — all UI components (exact paths)
```
components/Providers.tsx                     global providers (toast, stores)
components/auth/PermissionGuard.tsx          conditional render by permission
components/module-settings/ModuleSettingsMenu.tsx   the "gear" dropdown on module pages
components/layout/Sidebar.tsx                nav rail (flat links, collapse, mobile drawer)
components/layout/Header.tsx                 top bar (search, bell, avatar menu)
components/layout/PageHeader.tsx             title+subtitle+actions slot
components/layout/GlobalSearch.tsx           header search + grouped results
components/layout/NotificationsDropdown.tsx  bell popup
components/layout/FloatingChat.tsx           floating chat widget
components/ui/Button.tsx  Card.tsx  Badge.tsx  Input.tsx  Toast.tsx  Toggle.tsx
components/ui/DashboardTile.tsx  EmptyState.tsx  Skeleton.tsx
components/ui/ColumnPicker.tsx  MultiSelect.tsx
components/dashboard/DashboardContent.tsx    dashboard body (+ AddDialogs below)
components/dashboard/AddDialogs.tsx          AddTodoDialog + AddReminderDialog
components/employees/EmployeeImportDialog.tsx
components/payroll/PayrollContent.tsx  TimesheetCreateDialog.tsx
components/todos/TodosContent.tsx  reminders/RemindersContent.tsx
components/expenses/ExpensesContent.tsx  reports/ReportsContent.tsx
components/documents/DocumentsContent.tsx  contracts/ContractsContent.tsx
components/lifecycle/LifecycleContent.tsx  org-chart/OrgChartContent.tsx
components/communication/CommunicationContent.tsx  email/EmailContent.tsx
components/notifications/NotificationsContent.tsx  portal/PortalContent.tsx
components/modules/LeaveCalendar.tsx         leaves calendar tab
components/employee-report/EmployeeReport.tsx analytics embedded in employee detail
```

### Supporting dirs
| Path | Contents |
|---|---|
| `lib/` | Domain logic ("engines" as functions): `dashboard-engine.ts`, `payroll-engine.ts`, `reminders-engine.ts`, `rbac.ts`+`permissions.ts`, `navigation.ts`, `api.ts` (fetch client), `mock-data.ts`+`persistence.ts` (data layer), `token.ts`+`passwords.ts` (auth crypto), `chart-theme.ts`, `theme-tokens.ts`, `utils.ts` (t(), formatters, getStatusColor), `module-route-map.ts`, `csv.ts`/`excel.ts` |
| `stores/` | Zustand: `auth-store`, `language-store` (lang/dir), `company-store`, `module-store`, `notification-store`, `ui-store` (sidebar collapsed) |
| `engines/` | Reusable UI engines: `table-engine/` (DataTable), `chart-engine/` (Chart wrapper), `form-engine/` (FormBuilder), `theme-engine/` (runtime branding), `notification-engine/` |
| `modules/<domain>/service.ts` | Typed service layer per domain (e.g. `modules/dashboard/service.ts`) wrapping lib/api |
| `hooks/` | `useAuth`, `usePermissions`, `useCompany`, `useModuleGate` |
| `types/index.ts` | All shared TS types/interfaces |
| `data/db.json` | Runtime persisted state (mounted volume). `db.backup.json` fallback |
| `public/icons/` + `sw.js` | PWA icons + service worker |
| `plugins/template/` | Plugin scaffold template |

---

## 1.6 RUNTIME WORKFLOWS (how things actually work)

### Auth flow
1. Login POST `/api/auth/login` → server verifies scrypt hash (`lib/passwords.ts`) → returns HMAC-SHA256 signed token (`lib/token.ts`).
2. Client stores it in `localStorage.scos_token`; middleware/API also accept `scos_token` cookie.
3. Every request sends `Authorization: Bearer <token>` (added automatically by `lib/api.ts`).
4. `/api/auth/me` hydrates `useAuthStore` (user, role, permissions). Route guards: `middleware.ts` redirects unauthenticated users to `/login`; page-level guards check permissions (e.g. administration requires `user:manage`).

### Data fetching pattern (used by every page)
```
Content component mounts
  → modules/<domain>/service.ts method   (thin typed wrapper)
  → lib/api.ts request()                 (adds token, 30s GET cache in Map)
  → app/api/<resource>/route.ts          (authFromRequest → RBAC check → engine call)
  → lib/*-engine.ts                      (business logic over in-memory state)
Response shape: { success: boolean, data?: T, error?: string }
Mutations auto-clear the GET cache. Toasts announce success/error.
```
Loading states = Skeleton components; errors = toast; empty = EmptyState.

### Persistence
- Single JSON store `data/db.json` (Docker volume). `lib/mock-data.ts` holds in-memory state; `lib/persistence.ts` saves/hydrates whole state. Server restart keeps data; editing db.json while running is overwritten on next persist.

### Module system (feature toggles)
- Admin toggles plugins at `/settings/modules` → stored + cookie `MODULE_STATES_COOKIE`.
- `middleware.ts` blocks disabled routes; sidebar filters via `visibleNavLinks(role, moduleStates)` using `lib/module-route-map.ts`.

### RBAC
- Roles ranked admin(1) > hr_manager(2) > manager(3) > employee(4).
- Permissions like `employee:manage`, `payroll:view`, `reports:read`, `settings:manage` checked server-side in every API route AND client-side via `PermissionGuard`/`usePermissions` to hide UI.

### i18n / RTL workflow
- `t(enText, arText, language)` inline translation helper (no dictionary files); `language` comes from `useLanguageStore`.
- Switching language sets `<html dir>` instantly → Tailwind logical props + `rtl:` variants handle mirroring; Cairo font swaps in automatically.

### Theming workflow
- `lib/theme-tokens.ts` presets + `engines/theme-engine` write CSS vars (`--card`, `--ink`, `--brand`…) aliased onto `--color-primary/-secondary/...` → entire palette repaints live. Branding page edits these tokens.

### Notifications & reminders
- Auto-generated reminders computed by `lib/reminders-engine.ts` from contracts/iqama/work permits/probation/documents expiries + user-created manual reminders (persisted). Notification engine feeds bell dropdown + `/notifications`.

---

## 1.7 DEV & DEPLOY WORKFLOW

```bash
npm run dev                    # dev server :3000 hot-reload
npx tsc --noEmit               # typecheck — must be 0 errors
npx next lint                  # lint — 0 errors required
npm run build                  # production build must pass
docker compose up -d --build   # deploy production :3001 (container hr-app)
curl -o /dev/null -w "%{http_code}" http://localhost:3001/login   # expect 200
```
- Demo logins: `admin@scos.sa` / `Password123!` · `employee@scos.sa` / `Password123!`
- Agent working rules live in `AGENTS.md`: one targeted change → verify (tsc + lint once each) → stop. No test suite exists; those commands are the only verification. Never run npm install or create docs unless asked.

---

## 2. DESIGN SYSTEM (current state — keep or improve)

### 2.1 Color tokens (CSS-var driven, alpha supported)
Tailwind classes like `bg-primary/10 text-primary` are used everywhere. **Never use raw Tailwind palette colors** (no emerald/blue/violet…).

| Token | Default hex | Usage |
|---|---|---|
| `primary` | `#009B77` pine green | Brand, active states, primary buttons, links |
| `primary-light/dark` | `#00B88D` / `#007A5E` | Hover/gradients |
| `secondary` | `#00205B` navy | Secondary accents, admin role pill, gradients |
| `accent` | `#FFC72C` gold | Highlights, live-preview pills, expense accents |
| `background` | `#F4F2EB` warm paper | App background |
| `surface` | `#F0EFE8` | Subtle surfaces |
| `warning` | `#FD7E14` | Pending/late/expiring states |
| `success` | `#198754` | Approved/active/completed states |
| `error` | `#DC3545` | Rejected/expired/destructive |
| `info` | `#0DCAF0` | Info states, processing, half-day |

Status color convention (`bg-{token}/10 text-{token}` chips):
- active/approved/completed/present/reimbursed → `success`
- pending/suspended/late → `warning`
- rejected/absent/terminated/expired → `error`
- half_day/overtime/processing → `info`
- inactive/cancelled/draft → gray

Icon chip pattern (used everywhere): `flex h-9 w-9 items-center justify-center rounded-xl bg-{token}/10 text-{token}` with a 16–20px lucide icon inside.

### 2.2 Typography
- LTR font: **Inter** (300–700). RTL font: **Cairo** (auto-switches via `html[dir="rtl"] body`).
- Page titles: `text-lg/xl font-bold`. Subtitles: `text-xs/sm text-gray-500`.
- KPI values: `text-[32px]/[36px] font-bold`. Body/labels: `text-sm`. Micro text: `text-xs` / `text-[11px]`.

### 2.3 Shape & elevation — CRITICAL quirk
A global utility squares almost every corner:
```css
[class*="rounded-"]:not([class*="rounded-full"]) { border-radius: 0; }
```
→ Only `rounded-full` elements (pills, avatars, dots) render round. Cards/buttons/inputs are visually **square-cornered** despite rounded-* classes in markup. Radius scale exists (`sm .25 / DEFAULT .5 / md .75 / lg 1 / xl 1.25 rem`) but is overridden. **A redesign may revisit this rule — flag it explicitly if you want rounded corners back.**

Shadows: `shadow-card` (subtle), `shadow-dropdown`, `shadow-modal`, plus Tailwind `shadow-md/lg/2xl`.

### 2.4 Motion
Easing token `scos = cubic-bezier(0.25, 0.8, 0.25, 1)`. Animations: `animate-fade-in` (150ms), `animate-slide-in` (200ms translateY -8px), `animate-shake` (form errors), ping dots for "Live". Buttons: `active:scale-[0.97]`.

### 2.5 RTL rules
- Custom variants available: `rtl:` and `ltr:` (e.g., `rtl:rotate-180` on back arrows).
- Logical properties preferred (`ms-auto`, `end-0`). Popups flip: `right-0 rtl:right-auto rtl:left-0`.
- Icons that imply direction (ArrowLeft/Right, ChevronLeft/Right) must flip in RTL.
- Search input icons sit left in LTR, right in RTL.

---

## 3. SHARED COMPONENT INVENTORY (exact current APIs)

### Layout chrome
- **PageHeader** (`components/layout/PageHeader.tsx`): h1 title + subtitle left; optional `actions` slot pushed to trailing edge (`flex flex-wrap items-center gap-2 sm:gap-3 shrink-0`), wraps under title on mobile.
- **Sidebar**: flat list (no groups). Brand block: 36px `bg-primary` square "S" + "SCOS / HR Management". Item: icon h-5 + label; active `bg-primary text-white`, idle `text-gray-600 hover:bg-gray-100`. Footer pinned Settings link (admin/hr_manager only). Collapse toggle: `lg:w-64` ↔ `lg:w-16` (icons only + tooltips). Mobile: off-canvas drawer + `bg-black/40 backdrop-blur-sm` overlay, slides from correct side in RTL.
- **Header** (left→right): mobile hamburger · desktop collapse toggle (`PanelLeftClose/Open`) · center **GlobalSearch** (`hidden md:flex flex-1`, searches employees/leaves/payroll/todos, grouped results + arrow-key nav) · **NotificationsDropdown** bell (`h-9 w-9 rounded-full bg-primary/10 text-primary`, unread count badge capped "9+") · **avatar-only profile button** (`h-8 w-8 rounded-full bg-primary`, first initial). Profile dropdown: name/email header → My Portal `/me` · My Profile `/settings/profile` · Settings (gated) · Language toggle row · divider · Logout (`text-error`).

### Primitives (`components/ui/`)
- **Button**: variants `primary` (bg-primary), `secondary`, `outline` (white/border-gray-300), `ghost` (text-gray-600 hover:bg-gray-100), `warning`, `danger` (bg-error). Sizes `sm h-8 px-3` / `md h-9 px-4` / `lg h-11 px-6`. Base: `rounded-lg font-medium transition-all active:scale-[0.97] disabled:opacity-50`. Prop `loading` shows spinner.
- **Card / CardHeader / CardBody**: `.card` = white + border-gray-100 + shadow-card; header `px-4 py-2.5 border-b`; body `p-4`.
- **Badge**: status pill `rounded-full px-2.5 py-0.5 text-xs font-medium`, color from §2.1 map, bilingual label.
- **Input**: label above (`text-sm font-medium text-gray-700`), field `block w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary`; error state = border-error + shake + alert text; helperText support.
- **Toast**: top-center overlay stack (`pt-[28vh]`, z-100), types success/error/warning/info, anatomy: white rounded-xl card + left border tint + 36px icon tile + message + X; auto-dismiss 4s.
- **Toggle**: Radix switch, track `w-11 h-6`, checked bg-primary, explicit RTL thumb mirror, optional label/description.
- **EmptyState**: centered py-16, 64px `bg-gray-100` icon tile (default Inbox), bilingual title/desc, action slot.
- **Skeleton / TableSkeleton / CardSkeleton / DetailSkeleton**: `animate-pulse bg-gray-200`.
- **DashboardTile** (KPI tile): `rounded-2xl border-gray-100 bg-white shadow-card`, hover lift when clickable; supports gradient icon tile (`tone="from-primary to-secondary"`), pct progress bar, value `text-[32px]`, sub-line, footer chips (link or span), compact mode.
- **ColumnPicker**: bordered trigger w/ Columns3 icon + count badge; popup w-72 with search + grouped checkboxes.
- **MultiSelect**: trigger button + popup checkbox list w/ selection count badge.

### Module-level patterns
- **ModuleSettingsMenu** ("gear"): bordered square `h-9 w-9` button, `Settings2` icon. Dropdown items: *Export CSV* (if handler passed), *Module settings* (if href), *Enable/disable modules* → `/settings/modules` (always). Present on most module pages (see per-page notes).
- **DataTable** (table engine): sortable headers, MultiSelect column filters above; no built-in search (pages add their own). Row click navigation where applicable.
- **Charts**: `<Chart>` from chart-engine; heights ~280px; colors ONLY from `useChartTheme()` palette + `statusHexMap()`. Types in use: bar (single + grouped series), donut (~68% inner radius), horizontal CSS bar lists.

---

## 4. NAVIGATION MAP

Sidebar order (`lib/navigation.ts`) — flat, no groups:

| # | Route | Label EN (AR) | Icon (lucide) | Gate |
|---|---|---|---|---|
| 1 | `/` | Dashboard (لوحة القيادة) | LayoutDashboard | — |
| 2 | `/employees` | Employees (الموظفون) | Users | module employee-management |
| 3 | `/todos` | To-Do (المهام) | ListTodo | module todo-management |
| 4 | `/documents` | Documents (المستندات) | FolderOpen | module document-management |
| 5 | `/email` | Email (البريد الإلكتروني) | Mail | module email |
| 6 | `/expenses` | Expenses (المصروفات) | Receipt | module expense-management |
| 7 | `/reports` | Reports (التقارير) | BarChart | permission reports:read |
| 8 | `/reminders` | Reminders (التذكيرات) | AlarmClock | — |
| 9 | `/lifecycle` | Lifecycle (دورة الحياة) | Rocket | — |
| 10 | `/contracts` | Contracts (العقود) | FileText | permission contracts:read |
| 11 | `/organization` | Org Chart (الهيكل التنظيمي) | Share2 | — |
| 12 | `/administration` | Administration (الإدارة) | Shield | user:manage (admin only) |

Non-sidebar routes: `/attendance`, `/leaves` (+new/[id]), `/payroll/*` (own sub-nav), `/communication`, `/notifications`, `/me`, `/login`, `/settings/*` (own sub-nav). Employees can also reach a limited portal view.

---

## 5. PAGE-BY-PAGE SPECIFICATION

Format per page: Purpose · Header actions (left→right) · Layout blocks in DOM order · Tables/dialogs · Notes.

---

### 5.1 DASHBOARD `/` ⚠️ ACTIVE REDESIGN TARGET
`components/dashboard/DashboardContent.tsx`

**Header row**: Left = time-based greeting "Good morning, {name}" (`text-xl font-bold`) + date/time line (`text-xs text-gray-500`, locale-aware). Right cluster: `Live` pill (success dot with ping animation) → **Refresh** button (bordered white, RefreshCw icon, spins while loading) → **Plus icon button** (`h-9 w-9` bordered, opens Add New modal) → **gear** (ModuleSettingsMenu "Dashboard").

**Add New modal** (centered overlay `bg-black/50`, panel `max-w-md rounded-2xl shadow-2xl`):
- Header: 40px `bg-primary/10` Plus tile + "Add New" + subtitle "What would you like to add?" + X close.
- Body: 2×2 option-card grid. Each card: 36px icon chip + label + small desc; hover lifts + border-primary/30.
  1. New Employee (UserPlus, primary chip) → link `/employees/new`
  2. Reminder (AlarmClock, warning) → opens AddReminderDialog
  3. Record Expense (Receipt, accent) → link `/expenses`
  4. New Todo (ListTodo, info) → opens AddTodoDialog

**AddTodoDialog** (`max-w-md` modal): FormHeader (ListTodo info tile + "New Todo") → Title* (autofocus) → Description textarea → Priority select (low/medium/high) + Due date (2-col grid) → Cancel (outline) / Save (primary, loading). POST `/todos`. Success toast + close.

**AddReminderDialog**: FormHeader (AlarmClock warning tile + "New Reminder") → Reminder Name* → Name (Arabic) optional → Due Date* → same footer pattern. POST `/reminders {create:true}`. Created reminders appear on Reminders page as kind "manual".

**Alert strip**: If any urgent items → up to 5 alert cards in `grid-cols-2 sm:3 lg:5`: Expired documents (FileText, error) → /documents · Critical expiries (Shield, error) → /employees · Not returned vacations (PlaneLanding, error) → /leaves · Pending approvals (ClipboardCheck, warning) → /leaves · Expiring soon (FileClock, warning) → /documents. Anatomy: tinted border/bg card, 32px icon tile, big count, tiny label, ArrowUpRight on hover. Zero alerts → single green "All clear" strip (CheckCircle2).

**Hero KPI grid — REDESIGN REQUESTED**: currently `grid lg:grid-cols-3`: left 2 cols = 2×2 of four large DashboardTiles (Total Employees · Present Today · Pending Leaves · Monthly Payroll) each with gradient icon tile, big value, sub, pct bar; right 1 col = stacked widgets. **User wants instead: 8 smaller KPI cards** covering more metrics (e.g., add: Open Tasks, Pending Expenses, Document Alerts, Not Returned, Iqama expiries, Late today…). Design these.

**Right column widgets — REDESIGN REQUESTED (user: "cube style looks childish")**: To-Do list widget, Recent Activity feed, Attendance mini-chart (7-day grouped bar, present/late/absent using STATUS_HEX), quick links. User wants the **To-Do grid bigger and properly built**, professional density, not toy-like boxes.

Also present lower: notifications preview card (type-tinted icon tiles), payroll/expense summary rows, department donut, leaves-by-status CSS bars — all theme-token colored.

---

### 5.2 EMPLOYEES LIST `/employees`
Inline in `app/(dashboard)/employees/page.tsx`.

Header (PageHeader "Employee Management"): ColumnPicker (Columns3 popover, persists localStorage) → Import (Upload, outline) → Export xlsx (Download, outline) → **Add Employee** (Plus, **primary**) → `/employees/new` → gear "Employees".

Blocks in order:
1. KPI row `grid-cols-2 lg:grid-cols-4` (DashboardTile): Total employees (Users, primary) · Active staff (Users, success) · Departments (Users, secondary) · Monthly payroll (DollarSign, warning).
2. Shortcut cards `grid-cols-3`: Leaves (CalendarDays) · Attendance (Clock) · Payroll (DollarSign) — white cards, primary icon, hover tint; gated by permission.
3. Table card (DataTable). Visible columns: Employee ID · Full Name (+email subline) · Department · Position · Nationality · Total Salary · Status badge · Actions. 26 more toggleable via ColumnPicker. Filters: Department + Status MultiSelects. Row click → detail. Row actions: View (Eye, primary) · Delete (Trash2, error, confirm).
4. **EmployeeImportDialog** (modal, from Import): Step 1 download template (outline) → Step 2 choose .xlsx (outline Upload) → preview table with OK/error chips → result banner → Close (outline) / Import Employees (primary).

---

### 5.3 EMPLOYEE DETAIL `/employees/[id]`
Custom header (no PageHeader): circular ghost back arrow (ArrowLeft, `rtl:rotate-180`, router.back()) → 48px initials avatar → name + status Badge beside it + "position · department" + employee ID. Right: **Edit Profile** (Pencil, outline) ⇄ Cancel while editing (X, outline).

View mode layout `grid lg:[280px_1fr]`:
- **Left rail**: Identity card (64px avatar, name, position, dept, status badge, ID; Contact rows Mail/Phone/MapPin with gray icons; Sponsor block) + Key Facts card (CreditCard icon header: Joined, Tenure, Contract, Nationality, Age).
- **Main**: 2–3 col grid of section cards (shadow-card, icon headers): Personal Information (User) · Employment (Briefcase) · Renewals & Expiries (CalendarDays; day-count chips: expired=error, ≤90d=warning, else success) · Compensation (DollarSign; salary rows + bold Total + bank box) · Time Off (Shield; balance turns error at ≤5 days) · Documents (FileText; list).
- Below full-width: "**Employee Report & Analytics**" heading (BarChart3 in primary/10 tile) + embedded analytics report component.

Edit mode: main area swaps to one Card "Edit Employee" containing ~30-field bilingual FormBuilder (names, contacts, IDs with regex validation, selects, salaries, expiry dates) → Save Changes.

States: DetailSkeleton while loading; EmptyState (SearchX) + "Back to Employees" if missing.

---

### 5.4 NEW EMPLOYEE `/employees/new`
Custom header: title "Add Employee" + subtitle; right Back (ArrowLeft, outline) → `/employees`.
Body: centered `max-w-3xl` Card; header UserPlus tile (primary/10) + "New Employee Record"; body = FormBuilder, ~17 paired field rows (first/last name*, email/phone, nationality/national ID* (10-digit), iqama/Arabic name/religion*, gender*/marital*, DOB/city, department*/role*, contract type*/hire date, bank/IBAN (24-char validation), basic salary*/housing, transport/end-of-service, sponsor name/ID, vacation days/balance, probation/work permit, iqama expiry/contract end). Submit: "Save Employee" (primary) → toast → redirect list. No dialogs.

---

### 5.5 ATTENDANCE `/attendance`
PageHeader "Attendance" (no header actions).
1. Flash strip (`bg-primary/10 text-primary`) after clock actions.
2. Filter bar (white bordered rounded-xl): Filter icon + date input + Department select + Clear text-button (only while filtering).
3. KPI row (4 DashboardTiles with pct bars): Present (UserCheck, success) · Late (AlarmClock, warning) · Absent/Half Day (UserX, error) · Total Records (CalendarClock, info).
4. Action row `lg:grid-cols-3`: **Clock In** card (LogIn success tile; primary button → outline after done, disabled) · **Clock Out** card (LogOut warning tile; warning variant button, disabled until clocked in) · **Today Status** card (ClipboardList primary tile; time range + today's badge). Clock captures GPS lat/lng.
5. Records card: header = Clock icon + title, right: Export CSV ghost icon-button then gear "Attendance" (with onExport). DataTable columns: Employee (+ID) · Date · Clock In · Clock Out (`--` placeholder) · Hours · Location (green pill w/ MapPin + coordinates when GPS) · Status badge. Status MultiSelect filter.

Badges: present=success, late=warning, absent=error, half_day=info, overtime=info.

---

### 5.6 LEAVES LIST `/leaves`
PageHeader "Leave Management": **Request Leave** (Plus, primary → `/leaves/new`) → Export CSV (Download, ghost) → gear "Leaves".
One Card. Header-left: tab pair **All Requests** (List icon) / **Calendar View** (Calendar icon) — active `bg-primary text-white`, inactive `bg-gray-100 text-gray-600`. Header-right: pending counter (Clock + "N pending", warning).
- List tab: status pill row (All/Pending/Approved/Rejected/Cancelled; active pill primary) → DataTable: Employee ID · Type · Dates · Total Days · Status badge · Actions (managers only, pending rows): Approve (CheckCircle2, success) · Reject (XCircle, error) · Delete (Trash2); spinner while acting; processed-date shown once decided. Row click → detail.
- Calendar tab: month grid (Chevron prev/next), day cells show leave chips.
Empty state: EmptyState (Calendar) + primary "Request Leave".

---

### 5.7 LEAVE DETAIL `/leaves/[id]`
Custom header: ghost back arrow (pushes `/leaves`) + "Leave Request" + "type · dates" subtitle; right: status Badge.
Grid `lg:grid-cols-3`: Col 1 **Request Details** card (FileText header; icon rows: Employee ID, Name, Type, Start, End, Total Days, Submitted, Processed At — each icon in gray square). Cols 2–3: **Reason** card + **Approval Workflow** card (pending+manager → explainer + Approve (primary CheckCircle2) + Reject (**danger** variant XCircle); non-manager → amber notice box; decided → gray summary + Cancel Approval (ghost sm Ban icon, managers, approved only)). Skeleton mirrors layout; EmptyState SearchX fallback.

---

### 5.8 NEW LEAVE `/leaves/new`
Custom header: ghost back arrow + "Request Leave".
Body `max-w-2xl` Card, CalendarDays header. Above form: live **day-count box** (`bg-primary/5 border-primary/10`, bold primary count) once dates chosen; conditional **policy hint box** (info tint) when type maps to a policy. FormBuilder fields: Employee* select · Leave Type* (annual/sick/unpaid/emergency) · Start Date* / End Date* · Reason textarea. Submit: "Submit Request" (primary); warning toasts on validation issues; redirect on success.

---

### 5.9 LIFECYCLE `/lifecycle` → `components/lifecycle/LifecycleContent.tsx`
Custom header: title + subtitle; right cluster: gear "Lifecycle" → **New Offboarding** (Handshake, outline) → **New Onboarding** (Rocket, primary).
1. KPI row (DashboardTiles): In Progress+Draft (Clock, warning) · Total Checklists (UserRound, primary) · Overdue (XCircle, error) · Completed (CheckCircle2, success).
2. Filter row: pill tabs All/Onboarding/Offboarding (active primary) … spacer … search input `w-52` (debounced).
3. Checklist cards `md:grid-cols-2`: top strip h-1.5 (onboarding=success, offboarding=error); header type icon square (Rocket on primary / Handshake on error) + employee name + meta; type + status chips; due line (OVERDUE appended in error); progress bar (success fill when complete else primary) + done/total; task checkboxes (done = success fill + white check + strikethrough label); controls: Start or Complete-all (sm outline), Cancel (sm ghost), Delete (sm ghost error).
**Modal** "New Onboarding/Offboarding Checklist": overlay `bg-black/40 backdrop-blur-sm`, `max-w-md`; fields Employee select* + Due date + Notes; footer Cancel (ghost) + Create Checklist (primary Plus).

Chips: status draft=gray, in_progress=warning, completed=success, cancelled=error.

---

### 5.10 DOCUMENTS `/documents` → `components/documents/DocumentsContent.tsx`
Custom header: title; right: **Send Reminders** (Send, outline, loading state) → CSV (Download, ghost) → gear "Documents" → **Upload Document** (Upload, **primary**).
1. Conditional alert banner (error tint if any expired, else warning tint for expiring; AlertTriangle; "View" link applies expired filter).
2. Inline **form card** (not modal; toggled by Upload/Edit): 2-col fields — Name EN/AR, Category select (contract/id_iqama/passport/visa/certificate/insurance/vehicle/real_estate/license/other), Expiry date, Remind-days-before, Owner, Description; footer Cancel (ghost) + Save/Add (primary).
3. Main card. Header: FileText icon + title + **view switch segmented control** (List LayoutList / Grid LayoutGrid / List+Viewer Columns3; active primary) … spacer … search (`sm:w-56`) + status select (All/Valid/Expiring Soon/Expired) + category select.
   - **Grid**: tiles `sm:2 lg:3 xl:4` — FileText tile tinted by health (error/warning/primary), name, size·category, expires/owner/dept lines, health badge; hover reveals Edit/Delete; click → viewer.
   - **List(+Viewer)**: divided rows `[35fr_25fr_30fr_10fr]`: icon+names / category chip (secondary tint) + health badge / audit lines / Edit+Delete right-aligned; selected row `bg-primary/5`. Viewer adds sticky right pane `lg:w-96`: scaled document preview by category (ID/Iqama card shape, passport shape w/ primary band, A4 sheet) + physical-size caption + X clear.
Health badges: Expired = error (AlertTriangle) · within remind window = warning "Nd left" (Clock) · healthy = success (CheckCircle2).

---

### 5.11 CONTRACTS `/contracts` → `components/contracts/ContractsContent.tsx`
PageHeader "Contracts & Agreements": single **New Contract** toggle (Plus, primary) showing/hiding inline form.
1. Stat cards `cols-2 md:4` (plain cards, colored numbers + icons): Active (CheckCircle2 success) · In renewal window (Clock warning) · Expired (XCircle error) · Active value (AlertTriangle accent).
2. Inline **New Contract** card (toggled): Type select, Linked employee select, Title*, Second party*, Start/End dates, Renewal notice days, Value, Notes; footer Cancel (ghost) + Create Contract (primary).
3. Table card: header filter pills All/Active/Renewal window/Expired (active primary) + spacer + search. Native scrollable table: Contract No (mono primary) + title · Type chip (secondary tint) · Second party (+linked employee subline) · Term (mono start → end) · Value (end-aligned) · Status badge · Delete (Trash2, gray→error). Empty state FileText circle.

---

### 5.12 PAYROLL SUITE `/payroll/*` (shared sub-nav layout)
Layout: header row (DollarSign icon + PageHeader "Payroll") then left nav card (`lg:w-60` sticky; horizontal-scroll pills on mobile) + content `.card p-4 sm:p-6`. Nav: Overview `/payroll` (Wallet) · Salary Setup `/payroll/employees` (Users) · GOSI `/payroll/gosi` (Shield) · WPS Files `/payroll/wps` (FileText) · Payslips `/payroll/payslips` (ReceiptText). Active item primary.

#### 5.12a Overview `/payroll`
Inline header: "Payroll Overview"; right: month input → **Process Payroll** (Play, primary, icon-only) → **Export** (Download, outline, icon-only) → gear "Payroll".
1. KPI grid (4): Records (Wallet primary/10) · Net Pay Total · GOSI Total · Processed Periods (text-only tiles).
2. "Timesheet & Adjustments" card (managers; ClipboardList header; Show/Hide outline sm toggle): grid lg:3 — period month input, OT multiplier, daily-rate source select (+custom rate conditionals); icon-button row (outline): Create Timesheet (opens dialog) · Template download (FileSpreadsheet) · Upload .xlsx (Upload). Preview: 4 mini tiles (Employees/Days/OT/Gross `bg-primary/5`) + preview table + warnings box (warning tint AlertCircle) + bottom-right **Apply to Payroll** (primary ClipboardList).
3. Records table: Employee · Period · Net Pay (bold) · GOSI · Status badge · Processed At · Payslip (Eye "View" primary link, new tab).
4. Footer helper card with link "Generate WPS File" → `/payroll/wps` (Download icon, primary text).
**TimesheetCreateDialog** (`max-w-4xl` modal): period month input; employee checkbox list; Auto-fill workdays (outline Play); Add Row (outline Plus); editable rows table (Employee select, Date, In, Out, OT Hrs, per-row Trash2 error); footer right→left: Cancel (ghost) · Generate & Download (outline Download) · Generate, Upload & Preview (primary FilePlus2).

#### 5.12b Salary Setup `/payroll/employees`
PageHeader; right-aligned stat block: Monthly Payroll Total (bold primary) over tiny label. One Card "Employee Salaries" (Wallet header) with table: Employee(+dept) · Basic · Housing · Transport · Other · Total · Bank (Landmark icon + IBAN) · Actions. Row edit mode swaps cells to number inputs (`w-24`) + live total (primary) + IBAN input; Save (primary sm) / Cancel (ghost sm); idle action Pencil (gray→primary). Gated payroll:manage else "View only". Info strip bottom (Phone icon).

#### 5.12c GOSI `/payroll/gosi`
PageHeader "GOSI Compliance Calculator". Grid lg:3 — Left "Inputs" card (Calculator header): Monthly Wage number (helper cap ﷼45,000) + Nationality segmented buttons Saudi/Non-Saudi (active primary) + "Applicable Wage" highlight box (`bg-primary/5`, 2xl primary number). Right span-2: 3 stat cards (Employee Share Users error · Employer Share TrendingUp secondary · Total Shield accent/20) + Contribution Breakdown table (rows with `--` for zeros; totals row: employee bold error, employer bold secondary) + Compliance Notes box (accent tint, 3 bullets: 9%+9%, 7-day registration, SANED Saudis only).

#### 5.12d WPS Files `/payroll/wps`
Plain h2 "WPS Salary Files". "Generate WPS File" card (FileText header): period month input → Generate/Regenerate (RefreshCw, primary, loading) → conditional Download (outline) saving `WPS_{period}.txt`; info banner (primary/5). Conditional Preview card: mono `<pre>` in gray-50, `max-h-96` scrollable.

#### 5.12e Payslips `/payroll/payslips`
Plain h2 + two chips: `{n} periods` (primary tint) · `{n} payslips` (success tint). "Payslip Records" card (ReceiptText header) table: Employee · Period · Net Pay (bold) · Status badge · Processed At · Actions right-aligned: View (ExternalLink, primary) new tab · Download (Download, gray) blob `.html`.

---

### 5.13 EXPENSES `/expenses` → `components/expenses/ExpensesContent.tsx`
Header row (flex-wrap): title h1; right: CSV export (Download, ghost icon) → gear "Expenses" → **New Expense** (Plus, primary icon).
1. KPI grid (icon tiles `h-10 w-10 rounded-lg`): Total amount (Wallet primary) · Pending amount (Clock warning) · Approved count (CheckCircle2 success) · Reimbursed count (RefreshCcw info).
2. Inline form card (Record Expense / Edit Expense): grid md:3 Date · Amount (﷼) · Payment Method select (cash/card/bank_transfer/mobile_payment/other); Category input with debounced suggestion dropdown (max 8, Lightbulb hint when new); grid md:2 Description · Vendor; grid md:2 Receipt Number · Notes; footer Cancel (ghost) + submit (primary, loading).
3. "Expense Records" card: header ReceiptText + filters (search `w-56` w/ Search icon flipping sides in RTL · status select · category MultiSelect). Table `min-w-[600px]`: Expense (category bold) · Details (truncated + micro date/vendor/method line) · Amount (bold primary, end) · Status pill · Actions end: pending rows get Reimburse (outline sm RefreshCcw) · Approve (secondary sm Check) · Reject (danger sm X); always Edit (Pencil gray→primary) · Delete (Trash2 error).

---

### 5.14 REPORTS `/reports` → `components/reports/ReportsContent.tsx`
Header: h1 "Reports & Analytics"; right: department filter pill (Filter icon + select) → **Export CSV** (raw button styled `bg-primary text-white` + Download) → gear "Reports" (with onExport).
KPI row (DashboardTiles xl:4): Total Employees (Users secondary) · Active Employees (UserCheck success + pct chip) · Pending Leaves (CalendarClock warning) · Monthly Payroll (Wallet primary, avg-salary sub).
Charts (280px, theme colors only):
1. Headcount by Department — bar (brand color, labels on), BarChart3 primary/10 header.
2. Payroll by Department — bar (ok color), Wallet secondary/10.
3. Employment Status — donut 68% (STATUS_HEX per status), PieChart success/10.
4. Contract Types — donut (full palette), Briefcase accent/10.
5. Nationality Comparison — donut, Globe primary/10.
6. Sponsor Share — donut, Building2 warning/10.
7. Full-width: Leave Requests by Status — CSS bars (LEAF_HEX approved=pending=rejected) + big colored counts, FileText info/10.
8. Conditional: Attendance Trend (7d) grouped bar (present/late/absent STATUS_HEX; UserCheck success header; spans 2 cols) beside "Today at a Glance" card (Clock primary): 2×2 count boxes + "Present now" list (green dots, top 5).
9. Payroll by Period — bar (err color, labels, last 6 periods).
10. Expenses by Category — donut.
11. Leave Balances table: Employee · Dept · Entitlement · Used · Remaining (semibold success) · Utilisation (mini `h-1.5` primary bar + pct), top 12 rows.
Footer tip strip (TrendingUp primary).

---

### 5.15 ORG CHART `/organization` → `components/org-chart/OrgChartContent.tsx`
Header: UserRound icon tile (primary/10) + h1 "Organization Chart" + subtitle; middle-right summary "{n} employees across {m} departments" (Users primary); far-right gear "Organization".
Body: `lg:grid-cols-2` of DepartmentCards — header Network icon (primary) + dept name + count pinned end. Per manager: root chip row (`border-primary/20 bg-primary/5`, initials avatar `bg-primary text-white` + name/position) then reports indented (`border-l-2 pl-4`, white rows, gray initials avatars). Empty: "No team leads assigned…".

---

### 5.16 ADMINISTRATION `/administration` (admin only; redirects otherwise)
PageHeader "Administration" (no header actions).
1. 4 DashboardTiles: Users (Users primary/10, chip "accounts") · Audit Logs (Activity info) · Admins (Shield warning + pct) · Employees (ClipboardList success + pct).
2. One Card, header-left pill tabs **Users** (Users icon) / **Audit Log** (Activity icon); header-right depends on tab — users: Add User (UserPlus, primary icon-only) + Reset Demo (RotateCcw, ghost icon-only, confirm); audit: Download CSV (ghost icon-only) + gear "Administration".
   - Users table: Name · Email · Role pill (admin secondary, hr_manager primary, manager warning, employee gray; inline role `<select>` except protected user-1) · Language · Remove (Trash2 error).
   - Audit table: User · Action · Details · Date.
**Add New User modal**: overlay `bg-black/50`, panel `max-w-md rounded-2xl p-6`, X close; fields Full Name, Full Name Arabic, Email, Role select + Language select (2-col); footer Cancel (ghost) + Create User (primary, loading).

---

### 5.17 MY PORTAL `/me` → `components/portal/PortalContent.tsx`
**Hero card**: gradient banner `h-28 bg-gradient-to-r from-primary via-primary/85 to-secondary/70`; overlapping 80px initials avatar tile (`ring-4 ring-white/60`, primary initials); name + "position · department · ID"; badges row (status Badge + "Active Employee" pill w/ Sparkles). Bottom-right: **Request Leave** (outline sm Plane → /leaves/new) · **My Attendance** (primary sm CalendarDays → /attendance).
Stat tiles (DashboardTiles, 4): Annual Entitlement (CalendarDays primary) · Days Remaining (Plane success, "{used} used" sub) · Present This Month (BellRing warning, clickable → attendance) · Latest Payslip (ReceiptText info, links PDF).
Two-column `xl:grid-cols-3`:
- Left stack: **My Leave Requests** card (Plane primary header; "View all" text-link → /leaves; rows = type + range/days + status Badge). **My Latest Payslips** card (ReceiptText; "All payslips" link; rows = period + status + net pay bold + PDF Download link, top 4).
- Right span-2: **My Attendance** card (month caption; table Date · In · Out · Status pills; total-hours footer). **Personal details CTA** gradient card (`from-primary/5 to-secondary/5`): UserCircle2 icon + copy + meta; right: View Profile (outline sm) + unread notifications (ghost sm BellRing).
No linked profile → centered EmptyState (UserCircle2).

---

### 5.18 TO-DO `/todos` → `components/todos/TodosContent.tsx`
PageHeader: **New Task** (Plus, primary icon-only button).
1. Inline form card (toggled): title/description inputs, priority select, due date; footer Cancel (ghost) + Save (primary, loading).
2. Stat cards `md:grid-cols-3`: Pending (Clock, warning) · In Progress (AlertCircle, info) · Completed (CheckCircle2, success).
3. Task list card: header with filters/search; rows: round checkbox toggle (click cycles pending→completed, spinner while toggling), title (strikethrough when done), meta; row actions Edit (Pencil) · Delete (Trash2).

---

### 5.19 REMINDERS `/reminders` → `components/reminders/RemindersContent.tsx`
PageHeader: Refresh (RefreshCw, ghost icon-only).
1. 3 stat cards: counts by urgency (requires-action highlighted).
2. "Requires action" card: table of due/expiring reminders (auto-generated from contracts/iqama/work permits/probation/documents + manual ones, kind "manual" = AlarmClock icon, label Manual/يدوي); row action **Notify** (outline sm, sends notification, loading per-row).
3. "Healthy (no action)" card (BadgeCheck success): table of OK items.

---

### 5.20 COMMUNICATION `/communication` → `components/communication/CommunicationContent.tsx`
Top-level tabs: **Chat** / **Announcements**.
Chat = messenger layout: contacts sidebar (search filter, initials avatars colored by hash, unread badges, last-message previews with smart timestamps) + conversation panel (header w/ partner info; messages list: own vs other bubbles, attachment cards w/ formatBytes sizes, reactions row with emoji picker popover (RTL-safe), hover actions edit (inline save/cancel) + delete (confirm)); composer: emoji button + text input + attach + send. Channels include "General" (Hash icon) and direct messages; polling keeps conversations fresh.
Announcements tab: broadcast list/composer for company-wide posts.

---

### 5.21 EMAIL `/email` → `components/email/EmailContent.tsx`
Radix tabs: **Settings** (Settings icon) · **Compose** (SendHorizonal) · **Outbox** (Inbox) · **Templates** (LayoutTemplate).
- Settings: Gmail connect card (connect/disconnect OAuth buttons, loading states) + manual SMTP credentials form grid + Save Credentials (outline sm) + **Send Test Email** (outline).
- Compose: recipient/category/subject/body fields, template picker chips (2-col grid buttons), send flow.
- Outbox: sent-mail table/history.
- Templates: CRUD for reusable templates (create/edit/delete).

---

### 5.22 NOTIFICATIONS PAGE `/notifications` → `components/notifications/NotificationsContent.tsx`
PageHeader: **Mark all read** (outline icon button, disabled when empty) · **Export CSV** (ghost icon).
Filter pill row (all/unread/info/success/warning/error — active primary). Card list: each row = type icon tile (info/success/warning/error tinted: Info/CheckCircle/AlertTriangle/AlertCircle) + bilingual title (unread bold, subtle tinted bg) + message + relative date + optional external link icon; click marks read. Unread count in header.

*(NotificationsDropdown in the header reuses the same visual language in a `w-80 sm:w-96` panel: header w/ "Mark all read" + gear shortcut → this page; list `max-h-96` scroll.)*

---

### 5.23 LOGIN `/login`
Centered full-screen on `bg-background` with two blurred gradient blobs (`bg-primary/10` top-right, `bg-accent/10` bottom-left). `max-w-4xl grid lg:grid-cols-2`:
- **Left branding panel** (hidden on mobile): version pill (Sparkles, primary tint) → logo 56px `bg-primary rounded-2xl` white Building2 + "SCOS Platform" wordmark + tagline → marketing paragraph → **Session Intelligence** glass card (Fingerprint header; rows Globe region+flag, MapPin IP, Laptop device, Clock time — from `/api/auth/geo`; footer ShieldCheck TLS + green Encrypted pill w/ Wifi).
- **Right login card** (`.card p-6 sm:p-8`, `max-w-md`): "Welcome back" + sub → Email Input (placeholder admin@scos.sa) → Password Input w/ Eye/EyeOff absolute toggle (position flips in AR) → error alert (`bg-error/10 animate-shake`) → **Sign In** (primary, full-width, loading).
- Demo chips under card: Admin (primary tint) / Employee (success tint) — one-tap login.
- Language switcher row (Globe + English/العربية) + caption "role: hierarchy-aware access".

---

### 5.24 SETTINGS `/settings/*` (shared left-rail layout)
Layout: PageHeader "Settings" + Settings icon; left rail nav card (`lg:w-60` sticky, pill list; horizontal scroll on mobile): Company Profile (Building2) · Branding & Themes (Palette) · Modules (Puzzle) · Work Week (Clock) · Holidays (CalendarDays) · Leave Policies (CalendarCheck) · Profile (User) · Billing (CreditCard) · Support (LifeBuoy). Active = `bg-primary text-white`. Children render in `.card p-4 sm:p-6`.

| Page | Contents |
|---|---|
| **company** | `max-w-2xl` card (Building2 tile): Company Name EN/AR, Tax Number (CR, 10-digit helper), Industry. Primary icon-only Save. |
| **branding** | Live theme studio. Preset grid (cards w/ 5-swatch strip + name + "live" pill; selected = ring-accent) → editor `lg:[1fr_340px]`: Color-token groups (Brand/Chrome/Surfaces/Status, native color pickers ~23 tokens) + Live preview mock (mini sidebar + payslip + pills). Save Theme (primary icon-only). Presets: Atlas Navy (default), Midnight, Sandstone, Graphite, Royal Indigo, Pearl Burgundy. Runtime repaints whole app via CSS vars. |
| **modules** | Warning banner (`role=alert`, warning tint) + "N of M plugins active" row (Sparkles) + card grid sm:2 lg:3 of module toggles (Radix Switch). Icon tiles use **gradients** (`bg-gradient-to-br text-white`): employees primary→secondary · leaves success→70% · payroll warning→70% · attendance info→70% · communication accent→70% · todos primary→info · documents success→primary · email error→70% · expenses warning→accent · reports info→primary · administration secondary→70%. Enabled card `border-success/30`; disabled dimmed. Sticky bottom Save (primary icon-only). |
| **leave-policies** | "Leave Entitlements" card (CalendarCheck): md:2 tiles per leave type (8 Saudi-law types) — Days/Year + Max Carryover number inputs, Paid toggle, Approval-required toggle. Outline Reset (RotateCcw) + primary Save. Accent note banner bottom. |
| **work-week** | Two cards (Clock primary headers): Working Hours (2 time inputs) + Weekend Days (7 Toggle rows, checked = working day). Primary Save. |
| **holidays** | Card (CalendarDays) header w/ **Add** primary button revealing inline form (Name EN/AR + date; bg-gray-50, fade-in); holiday rows w/ Trash2 delete (hover error); primary Save below border-t. Hand-rolled empty state. |
| **billing** | `max-w-4xl` grid lg:3: Current Plan card span-2 (CreditCard; Enterprise plan, price, Active pill success/10, 3 stat boxes, feature checklist w/ success checks) + sidebar: Usage card (progress bars primary fill) + actions card (Invoice History outline w-full History icon; Upgrade Plan ghost text) + demo warning box. |
| **support** | `max-w-4xl`: resource cards grid (Book primary, FileText secondary, HelpCircle warning, MessageSquare info — each 48px tinted tile + ExternalLink pinned) + Contact Us card (3 columns, primary-tint circles: Mail etc.). |
| **profile** | `max-w-2xl` card: avatar disc (primary/10) + name + role; inputs Name EN/AR; disabled Email + Role. Primary icon-only Save (loading). |

**Convention note:** most settings saves are **icon-only Save buttons** with label in `title`/aria-label.

---

## 6. CURRENT KNOWN DESIGN DEBTS (context for your redesign)

1. **Dashboard hero area** — user rejected the 4 large KPI tiles; wants **8 smaller KPI cards** with more metrics. Design these (labels/icons/tone assignments welcome).
2. **Dashboard right-column widgets** (To-Do, Recent Activity, mini charts) — user calls them "cube style… childish"; wants the **To-Do widget bigger, properly built, professional density**.
3. **Square-corner global rule** (§2.3) fights the `rounded-*` classes everywhere — decide: embrace sharp corners deliberately OR remove rule for consistent rounding. Flag your choice prominently.
4. Icon-only buttons rely on `title` tooltips — consider visible labels for primary actions where space allows.
5. Dialog family inconsistency: some modals use backdrop blur (`backdrop-blur-sm`), others plain `bg-black/50`; entrance animations inconsistent (some `animate-fade-in`, some none).
6. Tables lack unified empty-state imagery (mix of EmptyState component and hand-rolled).
7. Login page is polished; interior pages vary in polish — aim for one coherent elevation/spacing scale.

## 7. WHAT TO DELIVER

Per redesigned surface, output:
1. **Layout spec** — block order, grid/flex structure, breakpoints (mobile ≥360, tablet ≥768, desktop ≥1024/1280), exact spacing rhythm (pick from 4/8/12/16/24/32).
2. **Component specs** — for every element: Tailwind class string (tokens only), size, typography, icon (lucide name), state styles (default/hover/active/disabled/loading), placement including RTL behavior.
3. **Interaction spec** — what each button/link opens, focus order, keyboard/Escape handling for overlays, toast feedback copy (EN + AR).
4. **Visual hierarchy rationale** — one line per major decision.
5. **Optional enhancements clearly marked** (never silently change data/flows).

Constraints recap: bilingual EN/AR with true RTL mirroring · theme tokens only · lucide icons only · respect permission gating described per page · keep all API payloads identical · accessible labels on icon-only controls.
