import { NextResponse } from 'next/server';
import { getCompany, updateCompany, updateCompanySettings, updateCompanyBranding } from '@/lib/mock-data';
import { Company, CompanySettings, Branding } from '@/types';

export async function GET() {
  const company = getCompany();
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  return NextResponse.json(company);
}

export async function PUT(req: Request) {
  const company = getCompany();
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

  const updated = { ...body } as Partial<Company>;

  if (body.settings) {
    const settings = body.settings as Partial<CompanySettings>;
    updateCompanySettings(settings);
    delete updated.settings;
  }

  if (body.branding) {
    updateCompanyBranding(body.branding as Branding);
    delete updated.branding;
  }

  if (Object.keys(updated).length > 0) {
    updateCompany(updated);
  }

  const result = getCompany();
  return NextResponse.json(result);
}
