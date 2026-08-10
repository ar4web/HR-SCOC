# ORB UI Page Design Reference

Use this as the default pattern for operational pages. The Employees page is the reference implementation.

## Information hierarchy

```text
Page title + primary actions
↓
Compact KPI row (2 columns on mobile, 4 on desktop)
↓
Related-module quick actions (three compact cards)
↓
Primary working area (table, list, form, or board)
```

Do not place related modules such as Leave, Attendance, or Payroll inside the page's main tab rail. They are separate workflows. Link to them through a compact quick-action row immediately below the KPIs.

## KPI card rules

- Use `grid-cols-2 gap-3 lg:grid-cols-4`.
- Use `DashboardTile` with `className="p-4"` for dense cards.
- Each card answers one operational question: total, active, departments, financial total, pending items, or risk.
- Use a short value, one short supporting line, and a meaningful icon/color.
- On mobile, let the fourth KPI span two columns only when its value needs more width (for example currency).
- Do not use large empty cards with a single small number.

## Quick-action row

- Use three equal compact cards: `grid grid-cols-3 gap-3`.
- Each card has one icon and a short label; it navigates to a dedicated workflow.
- Keep only actions the current user can access. If an action is unavailable, do not show it.
- Good examples: Leave, Attendance, Payroll; Documents, Expenses, Reports; Team, Announcements, Tasks.

## Responsive and RTL rules

- Mobile page padding: `p-4 sm:p-6`.
- Header padding: `px-4 sm:px-6`.
- Never hide necessary actions with hover only; on touch devices actions must be visible.
- Fixed elements must not share a corner: chat at the lower logical end; toasts at the upper logical end.
- In Arabic, sidebar opens from the right; chat and toasts use the opposite logical corner.
- Use `100dvh`, not `100vh`, for tall interactive panels.
- Tables must have `overflow-x-auto scrollbar-thin`, keyboard focus, and an accessible label.

## Visual style

- Background: warm neutral app background.
- Cards: white/cream surface, subtle border, low shadow, rounded-xl or rounded-2xl.
- Spacing: use 12px (`gap-3`) for dense page sections and 24px (`space-y-6`) between main sections.
- Primary color signals an actionable or selected state; do not use it for decoration only.
- Prefer calm, compact dashboards over oversized tiles.

## Build pattern for a new page

1. Add heading, description, and primary actions.
2. Add 2–4 KPIs based on data already loaded by the page.
3. Add 0–3 links to adjacent workflows—do not embed their full screens.
4. Place the primary list/table/form below the summary.
5. Check at 390px, 1440px, and Arabic RTL before calling it done.

## Acceptance checklist

- No unexpected horizontal page scroll at 390px.
- Cards have useful content, not empty height.
- Core actions are reachable by touch and keyboard.
- English and Arabic layouts use correct logical placement.
- A user can identify the page purpose and next action in five seconds.
