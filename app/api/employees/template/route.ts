import { NextResponse } from 'next/server';
import { buildEmployeeTemplate } from '@/lib/excel';
import { authFromRequest, hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const buffer = buildEmployeeTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee-import-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}