import { NextResponse } from 'next/server';
import { listContracts, createContract, contractSummary, resolveEmployeeName, availableEmployees } from '@/lib/contracts-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { isPluginEnabled } from '@/lib/plugins/guard';
import type { AgreementType, ContractStatus } from '@/types';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isPluginEnabled('contracts')) {
    return NextResponse.json({ error: 'Contracts plugin is disabled' }, { status: 403 });
  }
  if (!hasPermission(auth.role, 'contracts:read')) {
    return NextResponse.json({ error: 'Forbidden: no contracts access' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') || 'all') as ContractStatus | 'all';
  const search = searchParams.get('search') || '';

  return NextResponse.json({
    data: listContracts({ status, search }),
    summary: contractSummary(),
    employees: availableEmployees(),
  });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'contracts:write')) {
    return NextResponse.json({ error: 'Forbidden: contracts managers only' }, { status: 403 });
  }
  if (!isPluginEnabled('contracts')) {
    return NextResponse.json({ error: 'Contracts plugin is disabled' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { contractType, title, partyB, employeeId, startDate, endDate, renewalNoticeDays, value, currency, notes } = body;

  if (!contractType || !title || !partyB || !endDate || !startDate) {
    return NextResponse.json({ error: 'contractType, title, partyB, startDate and endDate are required' }, { status: 400 });
  }

  const company = {
    id: 'demo-company',
    name: 'SCOS HR',
    nameAr: 'شركة سكوس',
  };

  const contract = createContract({
    contractType: contractType as AgreementType,
    title: String(title),
    partyA: String(company.name),
    partyB: String(partyB),
    employeeId: employeeId ? String(employeeId) : undefined,
    employeeName: employeeId ? resolveEmployeeName(String(employeeId)) : undefined,
    startDate: String(startDate),
    endDate: String(endDate),
    renewalNoticeDays: Number(renewalNoticeDays) || 30,
    value: Number(value) || 0,
    currency: String(currency || 'SAR'),
    status: 'active',
    notes: notes ? String(notes) : undefined,
  });

  return NextResponse.json(contract, { status: 201 });
}