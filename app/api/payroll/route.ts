import { NextResponse } from 'next/server';
import { getPayrolls, processPayroll } from '@/lib/payroll-engine';
import { employees } from '@/lib/mock-data';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');
  const employeeId = searchParams.get('employeeId');

  let list = getPayrolls();
  if (period) list = list.filter((p) => p.period === period);
  if (employeeId) list = list.filter((p) => p.employeeId === employeeId);
  list.sort((a, b) => new Date(b.processedAt || '').getTime() - new Date(a.processedAt || '').getTime());

  return NextResponse.json({ data: list, total: list.length });
}

export async function POST(req: Request) {
  const { period } = await req.json();
  if (!period) {
    return NextResponse.json({ error: 'Period is required (e.g. 2024-01)' }, { status: 400 });
  }

  const result = processPayroll(period);
  return NextResponse.json(result);
}
