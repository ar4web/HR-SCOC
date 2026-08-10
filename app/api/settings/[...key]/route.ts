import { NextResponse } from 'next/server';
import { getCompany, updateCompanySettings } from '@/lib/mock-data';
import { CompanySettings, WorkWeek, Holiday, LeavePolicy } from '@/types';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

type Context = { params: { key: string[] } };

const SETTING_SECTIONS: Record<string, keyof CompanySettings> = {
  'work-week': 'workWeek',
  holidays: 'holidays',
  'leave-policies': 'leavePolicies',
  'working-hours': 'workingHours',
  weekend: 'weekendDays',
  overtime: 'overtimeRate',
};

export async function GET(req: Request, { params }: Context) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }

  const company = getCompany();
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const [sectionKey] = params.key;
  if (!sectionKey) {
    return NextResponse.json(company.settings);
  }

  const section = SETTING_SECTIONS[sectionKey];
  if (!section) {
    return NextResponse.json({ error: `Unknown settings section: ${sectionKey}` }, { status: 400 });
  }

  return NextResponse.json(company.settings[section]);
}

export async function PUT(req: Request, { params }: Context) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/admin only' }, { status: 403 });
  }

  const company = getCompany();
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const [sectionKey] = params.key;
  if (!sectionKey) {
    return NextResponse.json({ error: 'Settings section is required' }, { status: 400 });
  }

  const section = SETTING_SECTIONS[sectionKey];
  if (!section) {
    return NextResponse.json({ error: `Unknown settings section: ${sectionKey}` }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const current = company.settings[section];
  const updated = mergeSection(section, current, body);

  updateCompanySettings({ [section]: updated } as Partial<CompanySettings>);
  return NextResponse.json(updated);
}

function mergeSection(
  section: keyof CompanySettings,
  current: unknown,
  body: unknown
): unknown {
  if (section === 'workWeek') {
    return { ...(current as WorkWeek), ...(body as Partial<WorkWeek>) };
  }
  if (section === 'workingHours') {
    return { ...(current as { start: string; end: string }), ...(body as { start?: string; end?: string }) };
  }
  if (section === 'holidays') {
    const incoming = (body as { holidays?: Partial<Holiday>[] })?.holidays || (body as Holiday[]);
    if (Array.isArray(incoming)) {
      return incoming.map((h) => ({ ...h, id: h.id || `holiday-${Math.random().toString(36).slice(2, 8)}` }));
    }
    return current;
  }
  if (section === 'leavePolicies') {
    const incoming = (body as { policies?: Partial<LeavePolicy>[] })?.policies || (body as LeavePolicy[]);
    if (Array.isArray(incoming)) {
      return incoming.map((p) => ({ ...(current as LeavePolicy[]).find((c) => c.type === p.type), ...p }));
    }
    return current;
  }
  return body;
}
