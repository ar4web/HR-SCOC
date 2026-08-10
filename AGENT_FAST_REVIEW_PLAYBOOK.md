# ORB — Fast Review & Safe-Fix Playbook

Use this guide for small, targeted improvements. The objective is to keep the app stable, avoid unnecessary refactors, and spend time only on proven issues.

## Operating rule

**Inspect → prove → make the smallest safe change → verify → report.**

Do not redesign pages, replace architecture, upgrade packages, or reformat unrelated files during a bug-fix task unless explicitly requested.

## Five-minute triage

Run these first:

```bash
git status --short
npm run lint
npx tsc --noEmit
npm run build
```

Then classify only what fails or what can be reproduced.

| Severity | Meaning | Action |
|---|---|---|
| P0 | Security/data loss/production outage | Stop feature work; fix or isolate immediately. |
| P1 | Core feature broken or access-control failure | Fix in the current focused task. |
| P2 | Visible UI, mobile, RTL, or workflow friction | Batch a few related fixes together. |
| P3 | Cosmetic wording, spacing, minor cleanup | Log it; do not expand the task. |

## Current small backlog

### Fix next only when verified visually

- Test the sidebar, chat launcher, and toast position in English and Arabic at mobile and desktop widths.
- Test the chat screen on a short mobile viewport; verify the dynamic-height change does not hide the composer.
- Check horizontal-scroll tables on real narrow widths and confirm keyboard focus enters the scroll region.
- Resolve React hook dependency warnings only when the relevant screen can be exercised; each change can affect refetch behaviour.

### Keep deferred

- Database migration, multi-instance support, and full session redesign: separate project, not a quick UI fix.
- New payroll functionality: keep the payroll module disabled if it is out of scope.
- Broad dependency upgrades: do only with a dedicated compatibility/test pass.

## Security baseline

Before real employee data is used, confirm all items below.

- Set a unique long `TOKEN_SECRET` in deployment secrets. The app must not use a demo fallback in production.
- Use HTTPS in production.
- Never commit `.env`, `data/`, cookie files, OAuth tokens, or exported employee reports.
- Give every API route server-side authentication and authorization. UI visibility is not permission control.
- Check ownership/department/company scope for any route accepting an ID.
- Validate request bodies with the existing Zod schemas; never trust TypeScript casting at runtime.
- Keep Gmail/OAuth credentials in environment variables or encrypted server storage; rotate them when exposed.
- Keep uploads constrained by file type, file size, row count, and required-column validation.
- Add rate limiting before public/internet-facing deployment, especially login and upload endpoints.

## Fast UI review checklist

Review only the affected page plus shared shell after each UI change.

1. Desktop (1440px): no unexpected overlap; page actions remain visible.
2. Mobile (390px): no horizontal page scroll; action buttons are reachable without hover.
3. Arabic RTL: sidebar, menus, icons, search affordances, chat, toasts, and text alignment mirror correctly.
4. Keyboard: Tab reaches buttons and controls; Escape closes menus/modal where applicable.
5. Loading/empty/error: screen remains understandable without data.

## Minimal implementation style

- Prefer existing components (`Button`, `Card`, `Input`, `Toast`) and existing Tailwind tokens.
- For responsive adjustments, use the smallest class change, e.g. `p-4 sm:p-6`.
- For RTL, use logical Tailwind variants (`rtl:left-*`, `rtl:right-*`, `rtl:border-l-*`) or the current language value consistently.
- On touch screens, do not hide required actions exclusively with `hover`.
- For fixed UI, assign corners deliberately: chat bottom corner; toasts top corner; modal `z-50`; toast `z-100`.
- Do not mix unrelated code cleanup with a visual fix.

## Verification standard

Choose the smallest relevant evidence:

| Change type | Required verification |
|---|---|
| Tailwind/layout-only | `git diff --check` + browser check at target widths |
| React state/effect | lint + affected workflow smoke test |
| API/permission | TypeScript/build + 401/403/allowed API cases |
| Dependency/configuration | clean install + build |

If local dependencies are missing, restore them with:

```bash
npm ci
```

Do not delete `.next`, reset Git, or modify data files while another agent/server may be active unless explicitly authorized.

## Efficient handoff format

Use this short report after every task:

```text
Fixed: <one sentence>
Files: <only changed files>
Verified: <exact command or visual check>
Deferred: <only real remaining concern>
```

This keeps reviews focused, avoids token waste, and makes it easy for the next agent to continue.
