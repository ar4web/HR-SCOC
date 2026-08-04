import { NextResponse } from 'next/server';
import { getAttendance, clockIn, clockOut } from '@/lib/attendance-engine';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const employeeId = searchParams.get('employeeId');
  const data = getAttendance(date || undefined, employeeId || undefined);
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const { action, employeeId } = await req.json();

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
  }

  if (action === 'clock-in') {
    const result = clockIn(employeeId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.record);
  }

  if (action === 'clock-out') {
    const result = clockOut(employeeId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.record);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
