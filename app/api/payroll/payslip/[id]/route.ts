import { NextResponse } from 'next/server';
import { generatePayslipHtml } from '@/lib/payroll-engine';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const html = generatePayslipHtml(params.id);
  if (!html) {
    return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
  }
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
