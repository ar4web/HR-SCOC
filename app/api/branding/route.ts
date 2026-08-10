import { NextResponse } from 'next/server';
import { companies, persistData } from '@/lib/mock-data';
import { Branding } from '@/types';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET() {
  const company = companies.get('demo-company');
  return NextResponse.json(company?.branding);
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/admin only' }, { status: 403 });
  }

  const company = companies.get('demo-company');
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  const body = (await req.json()) as Branding;
  company.branding = body;
  persistData();
  return NextResponse.json(company.branding);
}
