import { NextResponse } from 'next/server';
import { getPayrolls, getWPSFile } from '@/lib/payroll-engine';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');

  if (!period) {
    return NextResponse.json({ error: 'Period is required' }, { status: 400 });
  }

  const wps = getWPSFile(period);
  return new NextResponse(wps, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="WPS_${period}.txt"`,
    },
  });
}
