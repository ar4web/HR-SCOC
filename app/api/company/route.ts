import { NextResponse } from 'next/server';
import { getCompany, updateCompany, updateCompanySettings, updateCompanyBranding, companies } from '@/lib/mock-data';
import { Company, CompanySettings, Branding } from '@/types';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { parseWith, companyUpdateSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';

function resolveCompany(auth: { companyId?: string } | null): Company | undefined {
  if (auth?.companyId && companies.has(auth.companyId)) {
    return companies.get(auth.companyId);
  }
  return getCompany();
}

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const company = resolveCompany(auth);
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  return NextResponse.json(company);
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }

  const company = resolveCompany(auth);
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: Partial<Company>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseWith(companyUpdateSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = { ...parsed.data } as Partial<Company>;

  if (parsed.data.settings) {
    const settings = parsed.data.settings as Partial<CompanySettings>;
    updateCompanySettings(settings);
    delete updated.settings;
  }

  if (parsed.data.branding) {
    updateCompanyBranding(parsed.data.branding as unknown as Branding);
    delete updated.branding;
  }

  if (Object.keys(updated).length > 0) {
    updateCompany(updated);
  }

  const result = getCompany();
  return NextResponse.json(result);
}