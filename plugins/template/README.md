# Plugin Template

Copy this folder to build a new bundled plugin for the SCOS HR app. A plugin adds one or more pages, a sidebar entry, and optional permissions — enabled/disabled from **Settings → Plugin Manager**.

## What a plugin needs

| File | Purpose |
|---|---|
| `registry-entry` | Add an entry to `lib/plugins/registry.ts` with metadata + pages |
| `module-definition` | Add a module definition in `lib/mock-data.ts` (`moduleDefinitions`) with `enabled: false` |
| `route-map` | Register each page route in `lib/module-route-map.ts` (`MODULE_ROUTE_MAP`) |
| `store-default` | Add the plugin id to `stores/module-store.ts` default states (default `false`) |
| `sidebar` | Add nav link(s) in `components/layout/Sidebar.tsx`, gated by your permission |
| `permissions` | Add permissions in `lib/rbac.ts` (`Permission` + `PERMISSION_ROLES`) |
| `api` | Create `app/api/<plugin>/route.ts` (+ `[id]` for detail) |
| `engine` | Create `lib/<plugin>-engine.ts` for business logic + status computation |
| `service` | Create `modules/<plugin>/service.ts` (client API wrapper) |
| `page` | Create `app/(dashboard)/<route>/page.tsx` (dynamic import client component) + component |

## Data

Add plugin collections to `lib/persistence.ts` (`PersistedState`) and wire them in `lib/mock-data.ts`:

1. Declare a `Map` (e.g. `export let contracts: Map<string, Contract> = new Map()`)
2. Add to `persist()` snapshot, `resetDemoData()`, and `ensureHydrated()`
3. Add CRUD helpers (`addX`, `updateX`, `deleteX`) that call `persist()`

## Guarding

- Server routes: call `isPluginEnabled('<plugin-id>')` from `lib/plugins/guard.ts`
- Middleware already blocks disabled plugin routes via `MODULE_ROUTE_MAP` (cookie states)
- Sidebar hides disabled plugins automatically via `MODULE_ROUTE_MAP`

## Conventions

- Bilingual: use `t('en', 'ar', language)` everywhere
- UI: reuse `components/ui/*` (`Card`, `CardBody`, `CardHeader`, `Button`, `Input`, `Toggle`, `Badge`)
- Client pages: `'use client'`, dynamic-imported via `next/dynamic` with `ssr: false`
- Auth: `authFromRequest` + `hasPermission` on every API route
- Icons: `lucide-react`; register the icon name in the Plugin Manager `ICON_MAP`